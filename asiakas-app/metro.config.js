const path = require('path')
const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

// Verkkosivun kanssa yhteinen koodi (frontend/src/lib), kuten kuljettajasovelluksessa:
// esim. Bidrop-sanamerkin vektorit (logoPaths.js).
config.watchFolders = [...(config.watchFolders ?? []), path.resolve(__dirname, '../frontend/src/lib')]

module.exports = config
