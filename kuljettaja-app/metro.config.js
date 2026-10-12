const path = require('path')
const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

// Verkkosivun kanssa yhteinen koodi: kartan värit (frontend/src/lib/mapStyle.js),
// jotta kuljettajan kartta näyttää samalta kuin asiakkaan seurantakartta.
config.watchFolders = [...(config.watchFolders ?? []), path.resolve(__dirname, '../frontend/src/lib')]

module.exports = config
