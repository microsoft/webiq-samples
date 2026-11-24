// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

targetScope = 'subscription'

@description('Region de la demo, independiente de Decision-1.')
param location string = 'spaincentral'

@description('Nombre del grupo de recursos que se creará en la suscripción seleccionada.')
param resourceGroupName string
@description('Nombre único global para la Azure Web App.')
param appServiceName string
@description('Nombre del App Service plan.')
param appServicePlanName string
param environmentName string = 'demo'
param deployedBy string
param createdAt string = utcNow()

@description('Endpoint OpenAI v1 del modelo que planifica y redacta el Caso 0. Vacío: el Caso 0 busca la pregunta tal cual.')
param llmEndpoint string = ''
param llmModel string = 'gpt-5.4-mini'
@description('Endpoint del proyecto de Foundry para activar el agente del Caso 6. Vacío: lo deja desactivado.')
param foundryProjectEndpoint string = ''
@description('Nombre del agente de Foundry del Caso 6.')
param foundryAgent string = 'revisor-contratos-telco'

@secure()
@description('Código que pide la web para usar el Caso 0. Vacío: se elimina el ajuste y el Caso 0 queda abierto.')
param liveAccessCode string = ''

@secure()
@description('Clave de Web IQ. Vacío: se elimina el ajuste y el Caso 0 queda desactivado.')
param webiqApiKey string = ''

var tags = {
  'created-at': createdAt
  environment: environmentName
  'deployed-by': deployedBy
  application: 'webiq-demo'
}

resource resourceGroup 'Microsoft.Resources/resourceGroups@2023-07-01' = {
  name: resourceGroupName
  location: location
  tags: tags
}

module app './app.bicep' = {
  name: 'webiq-app'
  scope: resourceGroup
  params: {
    location: location
    appServiceName: appServiceName
    appServicePlanName: appServicePlanName
    tags: tags
    llmEndpoint: llmEndpoint
    llmModel: llmModel
    foundryProjectEndpoint: foundryProjectEndpoint
    foundryAgent: foundryAgent
    liveAccessCode: liveAccessCode
    webiqApiKey: webiqApiKey
  }
}

output resourceGroupId string = resourceGroup.id
output appServiceId string = app.outputs.appServiceId
output appServicePlanId string = app.outputs.appServicePlanId
output appUrl string = app.outputs.appUrl
output principalId string = app.outputs.principalId
