@minLength(1)
param environmentName string

param location string = resourceGroup().location

param apiImageName string = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'
param webImageName string = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'

@secure()
param foundryProjectEndpoint string = ''

param foundryAgentId string = ''
param foundryTenantId string = ''
param foundryModelDeployment string = ''

var suffix = uniqueString(resourceGroup().id, environmentName)
var managedEnvironmentName = take('${environmentName}-aca-${suffix}', 32)
var logAnalyticsName = take('${environmentName}-law-${suffix}', 63)
var apiName = take('${environmentName}-api-${suffix}', 32)
var webName = take('${environmentName}-web-${suffix}', 32)
var tags = {
  'azd-env-name': environmentName
  project: 'failsafe'
  purpose: 'hackathon-submission'
}

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: logAnalyticsName
  location: location
  tags: tags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

resource managedEnvironment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: managedEnvironmentName
  location: location
  tags: tags
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

resource api 'Microsoft.App/containerApps@2024-03-01' = {
  name: apiName
  location: location
  tags: union(tags, {
    'azd-service-name': 'api'
  })
  properties: {
    managedEnvironmentId: managedEnvironment.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 4000
        transport: 'auto'
      }
    }
    template: {
      containers: [
        {
          name: 'api'
          image: apiImageName
          env: [
            {
              name: 'NODE_ENV'
              value: 'production'
            }
            {
              name: 'ORCHESTRATOR_API_PORT'
              value: '4000'
            }
            {
              name: 'AZURE_FOUNDRY_PROJECT_ENDPOINT'
              value: foundryProjectEndpoint
            }
            {
              name: 'AZURE_FOUNDRY_AGENT_ID'
              value: foundryAgentId
            }
            {
              name: 'AZURE_TENANT_ID'
              value: foundryTenantId
            }
            {
              name: 'AZURE_FOUNDRY_MODEL_DEPLOYMENT'
              value: foundryModelDeployment
            }
          ]
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/health'
                port: 4000
              }
              initialDelaySeconds: 10
              periodSeconds: 20
            }
            {
              type: 'Readiness'
              httpGet: {
                path: '/health'
                port: 4000
              }
              initialDelaySeconds: 5
              periodSeconds: 10
            }
          ]
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 1
      }
    }
  }
}

resource web 'Microsoft.App/containerApps@2024-03-01' = {
  name: webName
  location: location
  tags: union(tags, {
    'azd-service-name': 'web'
  })
  properties: {
    managedEnvironmentId: managedEnvironment.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 3000
        transport: 'auto'
      }
    }
    template: {
      containers: [
        {
          name: 'web'
          image: webImageName
          env: [
            {
              name: 'NODE_ENV'
              value: 'production'
            }
            {
              name: 'NEXT_PUBLIC_API_BASE_URL'
              value: '/api/failsafe'
            }
            {
              name: 'ORCHESTRATOR_API_BASE_URL'
              value: 'https://${api.properties.configuration.ingress.fqdn}'
            }
          ]
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/'
                port: 3000
              }
              initialDelaySeconds: 20
              periodSeconds: 20
            }
            {
              type: 'Readiness'
              httpGet: {
                path: '/'
                port: 3000
              }
              initialDelaySeconds: 10
              periodSeconds: 10
            }
          ]
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 1
      }
    }
  }
}

output API_URI string = 'https://${api.properties.configuration.ingress.fqdn}'
output WEB_URI string = 'https://${web.properties.configuration.ingress.fqdn}'
