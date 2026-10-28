import { Redirect } from 'expo-router'

// Paluuosoite selainkirjautumisesta (lib/oauth.js käsittelee istunnon). Jos
// puhelin avaa osoitteen sovelluksessa erikseen, alkunäyttö ohjaa eteenpäin.
export default function OAuthReturnScreen() {
  return <Redirect href="/" />
}
