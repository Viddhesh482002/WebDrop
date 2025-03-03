// Get QRCode from the global scope
const QRCode = window.QRCode;

// QR Code React Component
const QRCodeComponent = ({ url }) => {
    const [mounted, setMounted] = React.useState(false);
    const qrRef = React.useRef(null);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    React.useEffect(() => {
        if (mounted && url && qrRef.current) {
            qrRef.current.innerHTML = ''; // Clear previous QR code
            new QRCode(qrRef.current, {
                text: url,
                width: 250,
                height: 250,
                colorDark: '#FFFFFF',
                colorLight: 'transparent',
                correctLevel: QRCode.CorrectLevel.H,
                margin: 2
            });
        }
    }, [mounted, url]);

    if (!mounted) return null;

    return (
        <div className="qr-wrapper">
            <div className="qr-gradient-overlay"></div>
            <div ref={qrRef}></div>
            <div className="qr-effects">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="qr-circle" style={{ '--delay': `${i * 0.5}s` }}></div>
                ))}
                {[...Array(20)].map((_, i) => (
                    <div key={`dot-${i}`} className="qr-dot" style={{
                        '--x': `${Math.random() * 100}%`,
                        '--y': `${Math.random() * 100}%`,
                        '--delay': `${Math.random() * 3}s`
                    }}></div>
                ))}
            </div>
        </div>
    );
};

// Initialize QR Code
window.initQRCode = function(url) {
    const root = document.getElementById('qrRoot');
    if (root && url) {
        ReactDOM.render(<QRCodeComponent url={url} />, root);
    }
}
