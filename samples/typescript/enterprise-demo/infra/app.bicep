// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

param location string
param appServiceName string
param appServicePlanName string
param tags object
param llmEndpoint string = ''
param llmModel string = 'gpt-5.4-mini'
param foundryProjectEndpoint string = ''
param foundryAgent string = ''
@secure()
param liveAccessCode string = ''
@secure()
param webiqApiKey string = ''

resource plan 'Microsoft.Web/serverfarms@2026-08-01' = {
  name: appServicePlanName
  location: location
  tags: tags
  kind: 'linux'
  sku: {
    name: 'F1'
    tier: 'Free'
  }
  properties: {
    reserved: true
  }
}

resource app 'Microsoft.Web/sites@2026-08-01' = {
  name: appServiceName
  location: location
  tags: tags
  kind: 'app,linux'
  // Identidad para pedir tokens de Entra al modelo del Caso 0 (rol Cognitive Services OpenAI User).
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    publicNetworkAccess: 'Enabled'
    clientAffinityEnabled: false
    siteConfig: {
      linuxFxVersion: 'NODE|22-lts'
      // El ZIP contiene dist/ ya compilado; no necesita npm ni node_modules.
      appCommandLine: 'node server/index.mjs'
      alwaysOn: false
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      scmMinTlsVersion: '1.2'
      http20Enabled: true
      remoteDebuggingEnabled: false
    }
  }
}

resource settings 'Microsoft.Web/sites/config@2026-08-01' = {
  parent: app
  name: 'appsettings'
  // Este recurso reemplaza TODOS los ajustes: pasa liveAccessCode y webiqApiKey en cada despliegue o se eliminarán.
  properties: union({
    HOST: '0.0.0.0'
    PORT: '8080'
    NODE_ENV: 'production'
    // Azure puede asignar un hostname con sufijo regional; no se presupone su forma.
    WEBIQ_ALLOWED_HOSTS: app.properties.defaultHostName
    SCM_DO_BUILD_DURING_DEPLOYMENT: 'false'
    ENABLE_ORYX_BUILD: 'false'
    WEBSITE_WARMUP_PATH: '/api/status'
    WEBSITE_WARMUP_STATUSES: '200'
    // Front ends de App Service: la IP del visitante llega en X-Forwarded-For (límites por IP del Caso 0).
    TRUST_PROXY: '1'
    LIVE_PER_MINUTE: '6'
    LIVE_DAILY_LIMIT: '200'
    LIVE_MAX_CONCURRENT: '4'
    WEBIQ_PROXY_PER_MINUTE: '8'
    WEBIQ_PROXY_DAILY_LIMIT: '200'
    WEBIQ_PROXY_MAX_CONCURRENT: '8'
    FOUNDRY_PER_MINUTE: '2'
    FOUNDRY_DAILY_LIMIT: '60'
    FOUNDRY_MAX_CONCURRENT: '2'
  },
  empty(llmEndpoint) ? {} : { LLM_ENDPOINT: llmEndpoint, LLM_MODEL: llmModel },
  empty(foundryProjectEndpoint) ? {} : { FOUNDRY_PROJECT_ENDPOINT: foundryProjectEndpoint },
  empty(foundryAgent) ? {} : { FOUNDRY_AGENT: foundryAgent },
  empty(liveAccessCode) ? {} : { LIVE_ACCESS_CODE: liveAccessCode },
  empty(webiqApiKey) ? {} : { WEBIQ_API_KEY: webiqApiKey })
}

resource scmAuth 'Microsoft.Web/sites/basicPublishingCredentialsPolicies@2026-08-01' = {
  parent: app
  name: 'scm'
  properties: {
    allow: false
  }
}

resource ftpAuth 'Microsoft.Web/sites/basicPublishingCredentialsPolicies@2026-08-01' = {
  parent: app
  name: 'ftp'
  properties: {
    allow: false
  }
}

output appServiceId string = app.id
output appServicePlanId string = plan.id
output appUrl string = 'https://${app.properties.defaultHostName}'
output principalId string = app.identity.principalId
