// Manejo de imágenes de perfil (opcional)
document.addEventListener('DOMContentLoaded', () => {
    const userAvatar = document.getElementById('user-avatar');
    const avatarInput = document.getElementById('avatar-input'); // Podrías agregar esto a tu HTML
    
    if (userAvatar && avatarInput) {
        // Cargar avatar actual si existe
        const user = firebase.auth().currentUser;
        if (user) {
            const storageRef = firebase.storage().ref();
            const avatarRef = storageRef.child(`avatars/${user.uid}/profile.jpg`);
            
            avatarRef.getDownloadURL().then((url) => {
                userAvatar.src = url;
            }).catch(() => {
                // Usar placeholder si no hay avatar
                userAvatar.src = 'https://via.placeholder.com/50';
            });
        }
        
        // Actualizar avatar cuando se suba una nueva imagen
       