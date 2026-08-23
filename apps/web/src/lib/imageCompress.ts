// Comprime uma imagem no navegador antes de mandar pro back — sem storage de
// blob externo configurado, spots guardam a imagem como data URL direto no
// Postgres, então o tamanho do arquivo original (celular tira foto em 4-12MB
// fácil) precisa cair bastante antes de virar base64.
const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.75;

export function compressImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
      const width = Math.round(img.width * scale);
      const height = Math.round(img.height * scale);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2D não suportado.'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Não foi possível ler essa imagem.'));
    };
    img.src = objectUrl;
  });
}
