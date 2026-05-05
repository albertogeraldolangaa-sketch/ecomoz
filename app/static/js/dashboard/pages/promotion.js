async function loadPromoverPage() {
    contentArea.innerHTML = `
   <div class="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 max-w-2xl mx-auto text-center">
       <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">Divulgue a sua Loja</h2>
       <p class="text-gray-600 dark:text-gray-400 mb-8">Use este QR Code nas suas redes sociais, cartões de visita ou balcão.</p>
       
       <div class="flex justify-center mb-8">
           <div class="p-4 bg-white rounded-xl shadow-lg border-2 border-blue-100">
               <div id="qrcode"></div>
           </div>
       </div>
       
       <div class="flex flex-col items-center space-y-4">
           <div class="w-full max-w-md">
               <label class="text-xs text-gray-500 text-left block mb-1">Link Direto</label>
               <div class="flex">
                   <input type="text" readonly value="${window.location.origin}/loja/${shopData.profile.slug}" class="form-input rounded-r-none bg-gray-50">
                   <button onclick="navigator.clipboard.writeText('${window.location.origin}/loja/${shopData.profile.slug}'); showToast('Link copiado!')" class="px-4 bg-blue-600 text-white rounded-r-md hover:bg-blue-700">
                       <i data-lucide="copy" class="w-5 h-5"></i>
                   </button>
               </div>
           </div>
           
           <button onclick="downloadQR()" class="btn btn-outline">
               <i data-lucide="download" class="w-4 h-4 mr-2"></i> Baixar QR Code
           </button>
       </div>
   </div>`;
   
   if (typeof lucide !== 'undefined') lucide.createIcons();
   
   // Gerar QR Code
   setTimeout(() => {
       const qrContainer = document.getElementById("qrcode");
       if (qrContainer) {
           qrContainer.innerHTML = "";
           new QRCode(qrContainer, {
               text: `${window.location.origin}/loja/${shopData.profile.slug}`,
               width: 200,
               height: 200,
               colorDark : "#000000",
               colorLight : "#ffffff",
               correctLevel : QRCode.CorrectLevel.H
           });
       }
   }, 100);
}

function downloadQR() {
   const qrCanvas = document.querySelector('#qrcode canvas');
   if (qrCanvas) {
       const link = document.createElement('a');
       link.download = `qr-code-${shopData.profile.slug}.png`;
       link.href = qrCanvas.toDataURL();
       link.click();
       showToast('QR Code descarregado!', 'success');
   }
}