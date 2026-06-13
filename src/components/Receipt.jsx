import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/receipt.css';

export default function Receipt() {
  const navigate = useNavigate();
  const [receipt, setReceipt] = useState(null);


  useEffect(() => {
    const lastOrder = localStorage.getItem("lastOrder");
    if (lastOrder) {
      const parsed = JSON.parse(lastOrder);
      // timestamp comes back as a string, convert it
      parsed.timestamp = new Date(parsed.timestamp);
      setReceipt(parsed);
    }
  }, []);

  const handlePrint = () => window.print();

  const handleBack = () => {
    const container = document.querySelector('.receipt-container');
    if (container) {
      container.classList.add('fade-out');
      setTimeout(() => {
        navigate(-1);
      }, 400);
      console.log("Navigating back to previous page.");
    } else {
      navigate(-1);
      alert("Navigation error: container element not found.");
      console.log("Navigation error: container element not found.");
    }
  };

  if (!receipt) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading receipt...</div>;
  }

  return (
    <div className="receipt-container" style={{ padding: '40px 20px', maxWidth: '500px', margin: '0 auto', backgroundColor: '#f5f0e8', minHeight: '100vh' }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        border: '2px solid #d4a574',
        overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(139, 69, 19, 0.15)',
      }}>
        {/* Header */}
        <div style={{ backgroundColor: '#8B4513', color: 'white', padding: '24px', textAlign: 'center' }}>
          <h2 style={{ margin: '0 0 4px 0', fontSize: '24px', fontFamily: 'Georgia, serif' }}>☕ NEUTRAL GROUNDS</h2>
          <p style={{ margin: '0', fontSize: '12px', opacity: 0.9 }}>Premium Coffee Experience</p>
          <p style={{ margin: '8px 0 0 0', fontSize: '11px', opacity: 0.8 }}>Receipt #{receipt.orderNum}</p>
        </div>

        {/* Timestamp + Customer */}
        <div style={{ padding: '12px 20px', backgroundColor: '#f9f7f4', borderBottom: '1px solid #e5e0d5', fontSize: '12px', color: '#666', textAlign: 'center' }}>
          <p style={{ margin: '0 0 4px 0' }}>{receipt.timestamp.toLocaleString('en-PH')}</p>
          <p style={{ margin: 0 }}>Customer: <strong>{receipt.customer}</strong></p>
        </div>

        {/* Items */}
        <div style={{ padding: '20px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #8B4513' }}>
                <th style={{ textAlign: 'left', paddingBottom: '8px', color: '#8B4513' }}>Item</th>
                <th style={{ textAlign: 'center', paddingBottom: '8px', color: '#8B4513' }}>Qty</th>
                <th style={{ textAlign: 'right', paddingBottom: '8px', color: '#8B4513' }}>Price</th>
                <th style={{ textAlign: 'right', paddingBottom: '8px', color: '#8B4513' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {receipt.items.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #e5e0d5' }}>
                  <td style={{ padding: '8px 0' }}>{item.name}</td>
                  <td style={{ textAlign: 'center', padding: '8px 0' }}>{item.quantity}</td>
                  <td style={{ textAlign: 'right', padding: '8px 0' }}>₱{item.price}</td>
                  <td style={{ textAlign: 'right', padding: '8px 0', fontWeight: 'bold', color: '#16a34a' }}>
                    ₱{(item.price * item.quantity).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div style={{ borderTop: '2px dotted #d4a574', paddingTop: '12px' }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '12px', backgroundColor: '#8B4513', color: 'white',
              fontWeight: 'bold', fontSize: '16px', borderRadius: '6px', marginBottom: '12px',
            }}>
              <span>TOTAL:</span>
              <span>₱{receipt.total.toLocaleString()}</span>
            </div>

            {/* Payment */}
            <div style={{ fontSize: '12px', color: '#666', backgroundColor: '#f9f7f4', padding: '12px', borderRadius: '6px', marginBottom: '12px' }}>
              <p style={{ margin: '0 0 4px 0', fontWeight: 'bold' }}>Payment: {receipt.paymentMethod}</p>
              <p style={{ margin: 0, fontSize: '11px' }}>Cashier: {receipt.staffName}</p>
            </div>

            <div style={{ textAlign: 'center', fontSize: '11px', color: '#999', fontStyle: 'italic' }}>
              Thank you for your purchase! 😊
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ padding: '16px', backgroundColor: '#f9f7f4', borderTop: '1px solid #e5e0d5', display: 'flex', gap: '12px' }}>
          <button onClick={handleBack} style={{
            flex: 1, padding: '12px', backgroundColor: 'white', color: '#8B4513',
            border: '2px solid #8B4513', borderRadius: '6px', fontSize: '14px',
            fontWeight: 'bold', cursor: 'pointer',
          }}>
            ← Back
          </button>
          <button onClick={handlePrint} style={{
            flex: 1, padding: '12px', backgroundColor: '#8B4513', color: 'white',
            border: 'none', borderRadius: '6px', fontSize: '14px',
            fontWeight: 'bold', cursor: 'pointer',
          }}>
            🖨️ Print
          </button>
        </div>
      </div>
    </div>
  );
}