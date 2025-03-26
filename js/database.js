// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyD3MI1klgBSHs1h6QT4VPNoScCfCwMV_Ck",
    authDomain: "usuario-b0384.firebaseapp.com",
    projectId: "usuario-b0384",
    storageBucket: "usuario-b0384.appspot.com",
    messagingSenderId: "196266170863",
    appId: "1:196266170863:web:4ea57f489df94aba94fe1a"
};

// Inicializar Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();

// Variables globales
let currentUser = null;

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            updateUserInfo();
            setupRealTimePosts();
            setupEventListeners();
        } else {
            window.location.href = 'index.html';
        }
    });
});

// Actualizar información del usuario en la UI
function updateUserInfo() {
    document.getElementById('user-name').textContent = currentUser.displayName || currentUser.email;
    if (currentUser.photoURL) {
        document.getElementById('user-avatar').src = currentUser.photoURL;
    }
}

// Configurar event listeners
function setupEventListeners() {
    // Publicar con el botón
    document.getElementById('publish-btn').addEventListener('click', publishPost);
    
    // Publicar con Enter (pero no Shift+Enter)
    document.getElementById('post-content').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            publishPost();
        }
    });
    
    // Cerrar sesión
    document.getElementById('logout-btn').addEventListener('click', () => {
        auth.signOut();
    });
}

// Configurar posts en tiempo real
function setupRealTimePosts() {
    const postsContainer = document.getElementById('posts-container');
    
    db.collection('posts')
        .orderBy('createdAt', 'desc')
        .onSnapshot(snapshot => {
            // Ocultar mensaje de carga
            const loadingElement = postsContainer.querySelector('.loading');
            if (loadingElement) loadingElement.remove();
            
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                    addPostToDOM(change.doc);
                }
                if (change.type === 'removed') {
                    removePostFromDOM(change.doc.id);
                }
            });
        }, error => {
            console.error("Error en tiempo real:", error);
            postsContainer.innerHTML = '<div class="error">Error al cargar publicaciones</div>';
        });
}

// Añadir post al DOM
async function addPostToDOM(doc) {
    const post = doc.data();
    const postId = doc.id;
    
    // Evitar duplicados
    if (document.getElementById(`post-${postId}`)) return;
    
    try {
        const userDoc = await db.collection('users').doc(post.userId).get();
        const userData = userDoc.data();
        
        const postElement = document.createElement('div');
        postElement.className = 'post';
        postElement.id = `post-${postId}`;
        
        const isOwner = currentUser && currentUser.uid === post.userId;
        
        postElement.innerHTML = `
            <div class="post-header">
                <img src="${userData.photoURL || 'https://via.placeholder.com/40'}" class="post-avatar">
                <div>
                    <div class="post-user">${userData.name || 'Usuario'}</div>
                    <div class="post-time">${formatTime(post.createdAt?.toDate())}</div>
                </div>
            </div>
            <div class="post-text">${post.content || ''}</div>
            ${post.imageUrl ? `<img src="${post.imageUrl}" class="post-image">` : ''}
        `;
        
        // Añadir al inicio del feed
        document.getElementById('posts-container').prepend(postElement);
        
    } catch (error) {
        console.error("Error al mostrar el post:", error);
    }
}

// Eliminar post del DOM
function removePostFromDOM(postId) {
    const postElement = document.getElementById(`post-${postId}`);
    if (postElement) {
        postElement.remove();
    }
}

// Publicar nuevo post
async function publishPost() {
    const content = document.getElementById('post-content').value.trim();
    const fileInput = document.getElementById('post-image');
    const file = fileInput.files[0];
    
    if (!content && !file) {
        alert('Por favor escribe algo o sube una imagen');
        return;
    }
    
    try {
        let imageUrl = null;
        
        // Subir imagen si existe
        if (file) {
            const storageRef = storage.ref();
            const fileRef = storageRef.child(`posts/${currentUser.uid}/${Date.now()}_${file.name}`);
            await fileRef.put(file);
            imageUrl = await fileRef.getDownloadURL();
        }
        
        // Crear el post en Firestore
        await db.collection('posts').add({
            userId: currentUser.uid,
            content: content,
            imageUrl: imageUrl,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Limpiar el formulario
        document.getElementById('post-content').value = '';
        fileInput.value = '';
        
    } catch (error) {
        console.error("Error al publicar:", error);
        alert('Error al publicar. Por favor intenta nuevamente.');
    }
}

// Formatear fecha
function formatTime(date) {
    if (!date) return '';
    
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Ahora mismo';
    if (minutes < 60) return `Hace ${minutes} min`;
    if (minutes < 1440) return `Hace ${Math.floor(minutes/60)} h`;
    
    return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short'
    });
}