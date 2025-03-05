let peer;
let conn;

function initializePeer() {
    if (peer) {
        peer.destroy();
    }

    // Always use production configuration
    const peerConfig = {
        host: 'webdrop-qu29.onrender.com',
        port: 443,
        path: '/',
        secure: true,
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
    
    // Check URL parameters after peer is initialized
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
    if (!peer || !peerId) {
        console.error('Peer or target peer ID not available');
        return;
    }

    console.log('Connecting to peer:', peerId);
    
    // Close existing connection if any
    if (conn) {
        conn.close();
    }

    try {
        conn = peer.connect(peerId, {
            reliable: true,
            serialization: 'json'
        });

        conn.on('open', () => {
            console.log('Connected to:', peerId);
            updateConnectionStatus(true);
            setupConnection();
            
            // Show success notification
            const notification = document.getElementById('notification');
            notification.textContent = 'Connected successfully!';
            notification.className = 'notification show success';
            setTimeout(() => notification.classList.remove('show'), 3000);
        });

        conn.on('error', (err) => {
            console.error('Connection error:', err);
            const notification = document.getElementById('notification');
            notification.textContent = 'Connection failed. Please try again.';
            notification.className = 'notification show error';
            setTimeout(() => notification.classList.remove('show'), 3000);
        });
    } catch (err) {
        console.error('Failed to establish connection:', err);
        const notification = document.getElementById('notification');
        notification.textContent = 'Failed to establish connection. Please try again.';
        notification.className = 'notification show error';
        setTimeout(() => notification.classList.remove('show'), 3000);
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

    // Always use the production URL for QR codes
    const productionUrl = new URL('https://webdrop-qu29.onrender.com');
    productionUrl.searchParams.set('connect', peer.id);
    
    // Use the React component to render the QR code
    if (typeof window.initQRCode === 'function') {
        window.initQRCode(customUrl || productionUrl.toString());
    } else {
        console.error('QR Code component not initialized');
    }
}

function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const connectId = urlParams.get('connect');
    
    if (connectId) {
        console.log('Found connection ID in URL:', connectId);
        
        // Function to attempt connection
        const attemptConnection = () => {
            if (peer && peer.id && connectId !== peer.id) {
                console.log('Attempting to connect to:', connectId);
                connectToPeer(connectId);
                return true;
            }
            return false;
        };

        // Try to connect immediately if peer is ready
        if (!attemptConnection()) {
            console.log('Peer not ready, will retry in 1 second');
            // If peer isn't ready, try again after a delay
            let retryCount = 0;
            const maxRetries = 5;
            const retryInterval = setInterval(() => {
                retryCount++;
                console.log(`Retry attempt ${retryCount}`);
                
                if (attemptConnection() || retryCount >= maxRetries) {
                    clearInterval(retryInterval);
                    if (retryCount >= maxRetries) {
                        console.log('Max retries reached, connection failed');
                        const notification = document.getElementById('notification');
                        notification.textContent = 'Failed to establish connection. Please try manually connecting.';
                        notification.className = 'notification show error';
                        setTimeout(() => notification.classList.remove('show'), 3000);
                    }
                }
            }, 1000);
        }
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