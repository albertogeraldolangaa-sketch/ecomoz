function createStaffRow(staff) {
    return `
   <tr data-id="${staff.id}" class="table-row">
       <td class="px-6 py-4 whitespace-nowrap">
           <div class="flex items-center">
               <img src="${staff.avatar_url || 'https://placehold.co/40x40/9CA3AF/1F2937?text=S'}" alt="Avatar" class="w-10 h-10 rounded-full mr-3 object-cover">
               <span class="text-sm font-medium text-gray-900 dark:text-white">${staff.name}</span>
           </div>
       </td>
       <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">${staff.title || 'N/A'}</td>
       <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">${staff.service_ids.length} serviços</td>
       <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
           <button onclick="editStaff(${staff.id})" class="text-amber-600">Editar</button>
           <button onclick="deleteStaff(${staff.id})" class="text-red-600 ml-2">Apagar</button>
       </td>
   </tr>`;
}

async function loadEquipaPage() {
    contentArea.innerHTML = `
   <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
       <div class="flex items-center justify-between mb-4">
           <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Equipa (Staff)</h3>
           <button onclick="openStaffModal()" class="btn btn-primary">+ Adicionar Membro</button>
       </div>
       <div class="overflow-x-auto table-container">
           <table class="min-w-full divide-y dark:divide-gray-600">
               <thead class="bg-gray-50 dark:bg-gray-700">
                   <tr>
                       <th class="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Nome</th>
                       <th class="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Função</th>
                       <th class="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Serviços</th>
                       <th class="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Ações</th>
                   </tr>
               </thead>
               <tbody id="equipa-table-body" class="divide-y dark:divide-gray-600">
                   ${createLoader()}
               </tbody>
           </table>
       </div>
   </div>`;
   if (typeof lucide !== 'undefined') {
       lucide.createIcons();
   }
   
   try {
       const staff = await apiFetch('/api/dashboard/staff');
       const tableBody = document.getElementById('equipa-table-body');
       if (staff.length === 0) {
           tableBody.innerHTML = `<tr><td colspan="4" class="text-center p-4 text-gray-500">Nenhum membro da equipa encontrado.</td></tr>`;
           return;
       }
       tableBody.innerHTML = staff.map(createStaffRow).join('');
       if (typeof lucide !== 'undefined') {
           lucide.createIcons();
       }
   } catch (error) {
       document.getElementById('equipa-table-body').innerHTML = `<tr><td colspan="4" class="text-center p-4 text-red-500">Não foi possível carregar a equipa.</td></tr>`;
   }
}

async function openStaffModal() {
   const form = document.getElementById('form-equipa');
   form.reset();
   form.dataset.id = '';
   document.getElementById('modal-equipa-title').textContent = 'Adicionar Membro';
   document.getElementById('staff_avatar_preview').classList.add('hidden');
   document.getElementById('staff_avatar_url').value = '';
   
   // Carregar serviços para o modal
   const servicesListDiv = document.getElementById('staff-services-list');
   servicesListDiv.innerHTML = '<p class="text-xs text-gray-500">Carregando serviços...</p>';
   try {
       const services = await apiFetch('/api/dashboard/services');
       if (services.length === 0) {
            servicesListDiv.innerHTML = '<p class="text-xs text-gray-500">Nenhum serviço criado. Crie serviços primeiro.</p>';
       } else {
           servicesListDiv.innerHTML = services.map(s => `
               <div class="flex items-center">
                   <input id="staff-service-${s.id}" name="staff-service" type="checkbox" value="${s.id}" class="h-4 w-4 rounded text-blue-600 border-gray-300 dark:text-amber-600 dark:border-gray-600" style="background:none;">
                   <label for="staff-service-${s.id}" class="ml-2 text-sm text-gray-700 dark:text-gray-300">${s.nome}</label>
               </div>
           `).join('');
       }
   } catch (error) {
       servicesListDiv.innerHTML = '<p class="text-xs text-red-500">Erro ao carregar serviços.</p>';
   }
   
   openModal('modal-add-equipa');
}

async function editStaff(id) {
   try {
       const staff = await apiFetch(`/api/dashboard/staff/${id}`);
       const form = document.getElementById('form-equipa');
       form.dataset.id = staff.id;
       
       document.getElementById('modal-equipa-title').textContent = 'Editar Membro';
       document.getElementById('staff_nome').value = staff.name;
       document.getElementById('staff_titulo').value = staff.title;
       document.getElementById('staff_avatar_url').value = staff.avatar_url;
       
       const preview = document.getElementById('staff_avatar_preview');
       if (staff.avatar_url) {
           preview.src = staff.avatar_url;
           preview.classList.remove('hidden');
       } else {
           preview.classList.add('hidden');
       }
       
       // Carregar serviços e marcar os associados
       const servicesListDiv = document.getElementById('staff-services-list');
       servicesListDiv.innerHTML = '<p class="text-xs text-gray-500">Carregando serviços...</p>';
       const services = await apiFetch('/api/dashboard/services');
       
       if (services.length === 0) {
            servicesListDiv.innerHTML = '<p class="text-xs text-gray-500">Nenhum serviço criado.</p>';
       } else {
           servicesListDiv.innerHTML = services.map(s => `
               <div class="flex items-center">
                   <input id="staff-service-${s.id}" name="staff-service" type="checkbox" value="${s.id}" ${staff.service_ids.includes(s.id) ? 'checked' : ''} class="h-4 w-4 rounded text-blue-600 border-gray-300 dark:text-amber-600 dark:border-gray-600" style="background:none;">
                   <label for="staff-service-${s.id}" class="ml-2 text-sm text-gray-700 dark:text-gray-300">${s.nome}</label>
               </div>
           `).join('');
       }
       
       openModal('modal-add-equipa');
   } catch (error) {
       showToast('Não foi possível carregar o membro', 'error');
   }
}

async function handleSaveStaff(event) {
   event.preventDefault();
   const form = document.getElementById('form-equipa');
   const id = form.dataset.id;
   const button = form.querySelector('button[type="submit"]');
   button.disabled = true;
   button.textContent = 'A guardar...';

   try {
       let avatarUrl = document.getElementById('staff_avatar_url').value;
       const fileInput = document.getElementById('staff_avatar');
       
       if (fileInput.files && fileInput.files[0]) {
           avatarUrl = await handleImageUpload(fileInput.files[0], 'staff');
       }

       const selectedServices = Array.from(document.querySelectorAll('input[name="staff-service"]:checked')).map(el => parseInt(el.value));
       
       const data = {
           name: document.getElementById('staff_nome').value,
           title: document.getElementById('staff_titulo').value,
           avatar_url: avatarUrl,
           service_ids: selectedServices
       };
       
       const url = id ? `/api/dashboard/staff/${id}` : '/api/dashboard/staff';
       const method = id ? 'PUT' : 'POST';
       
       await apiFetch(url, { method: method, body: data });
       showToast(`Membro ${id ? 'atualizado' : 'criado'} com sucesso!`, 'success');
       closeModal('modal-add-equipa');
       await loadEquipaPage();

   } catch (error) {
       showToast(error.message, 'error');
   } finally {
       button.disabled = false;
       button.textContent = 'Guardar Membro';
   }
}

async function deleteStaff(id) {
   if (!confirm('Tem a certeza que quer apagar este membro da equipa?')) return;
   try {
       await apiFetch(`/api/dashboard/staff/${id}`, { method: 'DELETE' });
       showToast('Membro apagado com sucesso!', 'success');
       await loadEquipaPage();
   } catch (error) {
       showToast(error.message, 'error');
   }
}