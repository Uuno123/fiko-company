// Kuvan valmistelu ennen latausta: pienennys enintään maxSize pikseliin
// pidemmältä sivulta ja JPEG-pakkaus. Puhelimen 12 Mt kuvasta tulee näin noin
// 200-400 kt, eikä Supabasen ilmainen tallennustila täyty.
export async function prepareImage(file, maxSize = 1600) {
  if (!file?.type?.startsWith('image/')) throw new Error('not_image')
  let bitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    // Esim. HEIC, jota selain ei osaa avata.
    throw new Error('unsupported_image')
  }
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const context = canvas.getContext('2d')
  // Läpinäkyvä tausta (PNG) valkoiseksi, ettei JPEG:stä tule mustaa.
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close?.()
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
  if (!blob) throw new Error('unsupported_image')
  return blob
}

export function imageErrorText(error) {
  const message = String(error?.message ?? '')
  if (message === 'not_image') return 'Valitse kuvatiedosto (JPG, PNG tai WebP).'
  if (message === 'unsupported_image') return 'Kuvamuotoa ei voitu avata. Käytä JPG- tai PNG-kuvaa.'
  if (/bucket not found/i.test(message)) return 'Kuvien lataus ei ole vielä käytössä. Ota yhteyttä Bidropin tukeen.'
  if (/exceeded|too large|payload/i.test(message)) return 'Kuva on liian suuri.'
  return 'Kuvan lataus epäonnistui. Tarkista yhteys ja yritä uudelleen.'
}
