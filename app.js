// Elementos del DOM
const postInput = document.getElementById("post-input");
const postButton = document.getElementById("post-button");
const postsContainer = document.getElementById("posts-container");
const photoButton = document.getElementById("photo-button");
const videoButton = document.getElementById("video-button");
const mediaInput = document.getElementById("media-input");
const mediaPreview = document.getElementById("media-preview");

// Variables globales
let selectedFile = null;
let currentUser = null;

// Función para cancelar la previsualización
function cancelPreview() {
  mediaPreview.innerHTML = "";
  selectedFile = null;
  mediaInput.value = "";
}

// Evento para selección de archivos
mediaInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  selectedFile = file;
  mediaPreview.innerHTML = "";

  // Botón para cancelar
  const cancelButton = document.createElement("button");
  cancelButton.className = "cancel-media";
  cancelButton.innerHTML = '<i class="fas fa-times"></i>';
  cancelButton.onclick = cancelPreview;

  if (file.type.startsWith("image/")) {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = document.createElement("img");
      img.src = event.target.result;
      img.alt = "Previsualización";
      mediaPreview.appendChild(img);
      mediaPreview.appendChild(cancelButton);
    };
    reader.readAsDataURL(file);
  } 
  else if (file.type.startsWith("video/")) {
    const videoURL = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.controls = true;
    video.innerHTML = `<source src="${videoURL}" type="${file.type}">`;
    mediaPreview.appendChild(video);
    mediaPreview.appendChild(cancelButton);
  }
});

// Botones para medios
photoButton.addEventListener("click", () => {
  mediaInput.accept = "image/*";
  mediaInput.click();
});

videoButton.addEventListener("click", () => {
  mediaInput.accept = "video/*";
  mediaInput.click();
});

// Función para subir archivos
async function uploadFile(file) {
  try {
    const fileRef = storage.ref(`posts/${currentUser.uid}/${Date.now()}_${file.name}`);
    const uploadTask = await fileRef.put(file);
    return await uploadTask.ref.getDownloadURL();
  } catch (error) {
    console.error("Error al subir archivo:", error);
    throw error;
  }
}

// Función para crear publicación
async function createPost(postData) {
  try {
    await db.collection("posts").add(postData);
  } catch (error) {
    console.error("Error al crear publicación:", error);
    throw error;
  }
}

// Manejar publicación
async function handlePost() {
  const postText = postInput.value.trim();

  if (!postText && !selectedFile) {
    alert("¡Escribe algo o sube una foto/video!");
    return;
  }

  try {
    postButton.disabled = true;
    postButton.textContent = "Publicando...";

    let mediaUrl = null;
    let mediaType = null;

    if (selectedFile) {
      mediaUrl = await uploadFile(selectedFile);
      mediaType = selectedFile.type.startsWith("image/") ? "image" : "video";
    }

    await createPost({
      userId: currentUser.uid,
      userEmail: currentUser.email,
      userName: currentUser.displayName || currentUser.email.split('@')[0],
      text: postText || null,
      mediaUrl: mediaUrl,
      mediaType: mediaType,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      likes: 0,
      comments: []
    });

    // Limpiar formulario
    postInput.value = "";
    cancelPreview();
  } catch (error) {
    alert("Error al publicar. Intenta nuevamente.");
  } finally {
    postButton.disabled = false;
    postButton.textContent = "Publicar";
  }
}

// Función para renderizar publicaciones
function renderPost(doc) {
  const post = doc.data();
  const postElement = document.createElement("div");
  postElement.className = "post";
  postElement.dataset.id = doc.id;
  
  let mediaHTML = "";
  if (post.mediaUrl) {
    if (post.mediaType === "image") {
      mediaHTML = `<div class="post-media"><img src="${post.mediaUrl}" alt="Publicación"></div>`;
    } else {
      mediaHTML = `
        <div class="post-media">
          <video controls><source src="${post.mediaUrl}" type="video/mp4"></video>
        </div>`;
    }
  }

  postElement.innerHTML = `
    <div class="post-header">
      <div class="post-avatar" style="background-color: ${stringToColor(post.userId)}"></div>
      <div class="post-user">${post.userName}</div>
    </div>
    ${post.text ? `<div class="post-text">${post.text}</div>` : ''}
    ${mediaHTML}
    <div class="post-actions">
      <div class="action like-button" data-id="${doc.id}">
        <i class="far fa-thumbs-up"></i> Me gusta (${post.likes || 0})
      </div>
      <div class="action"><i class="far fa-comment"></i> Comentar</div>
      <div class="action"><i class="fas fa-share"></i> Compartir</div>
      ${post.userId === currentUser.uid ? 
        `<div class="action delete-button" data-id="${doc.id}">
          <i class="fas fa-trash"></i> Eliminar
        </div>` : ''}
    </div>
  `;

  return postElement;
}

// Función para generar color a partir de string
function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = `hsl($(hash % 360}, 70%, 60%)`;
  return color;
}

// Cargar publicaciones
function loadPosts() {
  postsContainer.innerHTML = '<div class="loading">Cargando publicaciones...</div>';
  
  db.collection("posts")
    .orderBy("timestamp", "desc")
    .onSnapshot(snapshot => {
      postsContainer.innerHTML = "";
      
      if (snapshot.empty) {
        postsContainer.innerHTML = '<div class="no-posts">No hay publicaciones aún</div>';
        return;
      }
      
      snapshot.forEach(doc => {
        postsContainer.appendChild(renderPost(doc));
      });

      // Agregar eventos a los botones de like
      document.querySelectorAll('.like-button').forEach(button => {
        button.addEventListener('click', handleLike);
      });

      // Agregar eventos a los botones de eliminar
      document.querySelectorAll('.delete-button').forEach(button => {
        button.addEventListener('click', handleDelete);
      });
    }, error => {
      console.error("Error al cargar publicaciones:", error);
      postsContainer.innerHTML = '<div class="error">Error al cargar publicaciones</div>';
    });
}

// Manejar likes
async function handleLike(e) {
  const postId = e.currentTarget.dataset.id;
  const postRef = db.collection("posts").doc(postId);
  
  try {
    const postDoc = await postRef.get();
    if (!postDoc.exists) return;
    
    const post = postDoc.data();
    const isLiked = e.currentTarget.classList.contains('liked');
    
    await postRef.update({
      likes: isLiked ? (post.likes || 0) - 1 : (post.likes || 0) + 1
    });
  } catch (error) {
    console.error("Error al actualizar like:", error);
  }
}

// Manejar eliminación
async function handleDelete(e) {
  if (!confirm("¿Estás seguro de eliminar esta publicación?")) return;
  
  const postId = e.currentTarget.dataset.id;
  try {
    await db.collection("posts").doc(postId).delete();
  } catch (error) {
    console.error("Error al eliminar publicación:", error);
    alert("No se pudo eliminar la publicación");
  }
}

// Inicializar la aplicación
function initApp() {
  auth.onAuthStateChanged(user => {
    if (!user) {
      window.location.href = 'index.html';
      return;
    }
    
    currentUser = user;
    loadPosts();
    setupUI(user);
  });
}

// Configurar UI
function setupUI(user) {
  // Configurar cierre de sesión
  document.querySelector('.menu-item:last-child').addEventListener('click', () => {
    auth.signOut().then(() => {
      window.location.href = 'index.html';
    });
  });
  
  // Mostrar nombre de usuario
  document.querySelectorAll('.user-name').forEach(el => {
    el.textContent = user.displayName || user.email.split('@')[0];
  });
}

// Eventos
postButton.addEventListener('click', handlePost);
postInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') handlePost();
});

// Iniciar
document.addEventListener('DOMContentLoaded', initApp);