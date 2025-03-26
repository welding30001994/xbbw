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
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Elementos del DOM
const registerForm = document.getElementById('register-form');
const loginForm = document.getElementById('login-form');
const showLogin = document.getElementById('show-login');
const showRegister = document.getElementById('show-register');
const registerBtn = document.getElementById('register-btn');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');

// Alternar entre formularios de registro y login
if (showLogin && showRegister) {
    showLogin.addEventListener('click', (e) => {
        e.preventDefault();
        registerForm.style.display = 'none';
        loginForm.style.display = 'flex';
    });

    showRegister.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.style.display = 'none';
        registerForm.style.display = 'flex';
    });
}

// Registrar nuevo usuario
if (registerBtn) {
    registerBtn.addEventListener('click', () => {
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const name = document.getElementById('register-name').value;
        
        auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Usuario registrado con éxito
                const user = userCredential.user;
                
                // Guardar información adicional del usuario en Firestore
                return db.collection('users').doc(user.uid).set({
                    name: name,
                    email: email,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            })
            .then(() => {
                // Redirigir a la página principal
                window.location.href = 'home.html';
            })
            .catch((error) => {
                // Manejar errores
                const errorMessage = error.message;
                document.getElementById('register-error').textContent = errorMessage;
            });
    });
}

// Iniciar sesión
if (loginBtn) {
    loginBtn.addEventListener('click', () => {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        auth.signInWithEmailAndPassword(email, password)
            .then(() => {
                // Redirigir a la página principal
                window.location.href = 'home.html';
            })
            .catch((error) => {
                // Manejar errores
                const errorMessage = error.message;
                document.getElementById('login-error').textContent = errorMessage;
            });
    });
}

// Cerrar sesión
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        auth.signOut().then(() => {
            // Redirigir a la página de login
            window.location.href = 'index.html';
        });
    });
}

// Observador de estado de autenticación
auth.onAuthStateChanged((user) => {
    if (user) {
        // Usuario ha iniciado sesión
        if (document.getElementById('user-name')) {
            // Cargar información del usuario en la página principal
            db.collection('users').doc(user.uid).get().then((doc) => {
                if (doc.exists) {
                    document.getElementById('user-name').textContent = doc.data().name;
                    // Aquí podrías cargar el avatar si lo tienes almacenado
                }
            });
        }
    } else {
        // Usuario no ha iniciado sesión
        if (window.location.pathname.includes('home.html')) {
            window.location.href = 'index.html';
        }
    }
});