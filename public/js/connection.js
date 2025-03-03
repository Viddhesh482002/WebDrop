let peer;
let conn;

function initializePeer() {
    if (peer) {
        peer.destroy();
    }

    let peerConfig;
    if (window.location.hostname === 'webdrop-qu29.onrender.com') {
        // Use hosted configuration
        peerConfig = {
            host: 'webdrop-qu29.onrender.com',
            port: 443,
            path: '/',
            secure: true
        };
    } else {
        // Use local configuration
        const protocol = window.location.protocol === 'https:' ? 'https' : 'http';
        const host = window.location.hostname;
        const port = window.location.port || (protocol === 'https' ? 443 : 80);
        peerConfig = {
            host: host,
            port: port,
            path: '/'
        };
    }

    // Add common config options
    peerConfig = {
        ...peerConfig,
        debug: 3,
        config: {
            'iceServers': [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        }
    };

    peer = new Peer(null, peerConfig);

    console.log('Initializing peer connection...', peerConfig);

    peer.on('open', handlePeerOpen);
    peer.on('connection', handleIncomingConnection);
    peer.on('error', handlePeerError);

    // Check for connection parameters after peer is initialized
    if (typeof handleConnectionParams === 'function') {
        handleConnectionParams();
    }
}

function handlePeerOpen(id) {
    console.log('Connected to server with ID:', id);
    document.getElementById('peerId').textContent = id;
    generateQRCode();
    updateConnectionStatus(false);
    
    checkUrlParams();
}

function handleIncomingConnection(connection) {
    console.log('Incoming connection from:', connection.peer);
    conn = connection;
    setupConnection();
}

function handlePeerError(err) {
    console.error('Peer error:', err);
    updateConnectionStatus(false);
    window.dispatchEvent(new Event('connection-error'));

    // Attempt to reinitialize on error
    setTimeout(() => {
        console.log('Attempting to reinitialize peer connection...');
        initializePeer();
    }, 5000);
}

function setupConnection() {
    if (!conn) {
        console.error('No connection to setup');
        return;
    }

    conn.on('open', () => {
        console.log('Connected to peer:', conn.peer);
        updateConnectionStatus(true);
    });

    conn.on('data', handleIncomingData);
    
    conn.on('close', () => {
        console.log('Connection closed');
        updateConnectionStatus(false);
    });
    
    conn.on('error', (err) => {
        console.error('Connection error:', err);
        updateConnectionStatus(false);
    });
}

function connectToPeer(peerId) {
    if (!peer) {
        console.error('Peer not initialized');
        return;
    }

    if (conn) {
        conn.close();
    }

    try {
        console.log('Attempting to connect to:', peerId);
        conn = peer.connect(peerId, {
            reliable: true
        });
        setupConnection();
    } catch (err) {
        console.error('Failed to connect:', err);
        window.dispatchEvent(new Event('connection-error'));
    }
}

function updateConnectionStatus(connected) {
    const statusText = document.getElementById('statusText');
    const indicator = document.getElementById('statusIndicator');
    
    if (connected) {
        statusText.textContent = 'Connected';
        indicator.classList.add('connected');
    } else {
        statusText.textContent = 'Disconnected';
        indicator.classList.remove('connected');
    }

    window.dispatchEvent(new CustomEvent('connection-status', {
        detail: { connected }
    }));
}

function generateQRCode(customUrl) {
    if (!peer || !peer.id) {
        console.error('Peer ID not available');
        return;
    }

    // Get the full URL for the QR code
    const url = new URL(window.location.href);
    url.searchParams.set('connect', peer.id);
    
    // Use the React component to render the QR code
    if (typeof window.initQRCode === 'function') {
        window.initQRCode(customUrl || url.toString());
    } else {
        console.error('QR Code component not initialized');
    }
}

function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const connectId = urlParams.get('connect');
    
    if (connectId) {
        console.log('Found connection ID in URL:', connectId);
        // Wait a bit to ensure peer is initialized
        setTimeout(() => {
            if (peer && peer.id && connectId !== peer.id) {
                connectToPeer(connectId);
            }
        }, 1000);
    }
}

function setupCopyButton() {
    const copyButton = document.getElementById('copyId');
    if (copyButton) {
        copyButton.addEventListener('click', async () => {
            const peerIdElement = document.getElementById('peerId');
            const currentId = peerIdElement ? peerIdElement.textContent : '';
            
            if (!currentId) {
                console.error('No peer ID available');
                const notification = document.getElementById('notification');
                notification.textContent = 'No peer ID available to copy';
                notification.className = 'notification show error';
                setTimeout(() => notification.classList.remove('show'), 3000);
                return;
            }

            try {
                // Create a temporary textarea
                const textarea = document.createElement('textarea');
                textarea.value = currentId;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                
                // Try to copy
                document.execCommand('copy');
                document.body.removeChild(textarea);

                // Update icon
                const icon = copyButton.querySelector('i.fas');
                if (icon) {
                    const originalClass = icon.className;
                    icon.className = 'fas fa-check';
                    setTimeout(() => {
                        icon.className = originalClass;
                    }, 2000);
                }
                
                // Show success notification
                const notification = document.getElementById('notification');
                notification.textContent = 'ID copied to clipboard!';
                notification.className = 'notification show success';
                setTimeout(() => notification.classList.remove('show'), 3000);
            } catch (err) {
                console.error('Failed to copy:', err);
                const notification = document.getElementById('notification');
                notification.textContent = 'Failed to copy ID';
                notification.className = 'notification show error';
                setTimeout(() => notification.classList.remove('show'), 3000);
            }
        });
    }
}

// Initialize connection and UI when page loads
window.addEventListener('load', () => {
    initializePeer();
    setupCopyButton();
});