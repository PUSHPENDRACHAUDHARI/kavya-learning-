import React, { useState, useEffect } from "react";
import axios from 'axios';
import {
  CreditCard,
  Building2,
  Smartphone,
  Lock,
  TrendingUp,
} from "lucide-react";
import "../assets/PaymentInterface.css";
import { useNavigate } from "react-router-dom";
import AppLayout from "./AppLayout";

const PaymentInterface = () => {
  const [state, setState] = useState({
    paymentMethod: "cards",
    cardNumber: "",
    cardholderName: "",
    expiryDate: "",
    cvv: "",
    walletOption: "",
    // UPI fields
    upiGateway: "",
    upiId: "",
    upiVerified: false,
  upiVerifiedName: '',
    // Netbanking fields
    netbankEmail: "",
    netbankPassword: "",
    // UI state
    processing: false,
    showSuccess: false,
    confirmDetails: null,
  });

  // Pricing state for order summary
  const [pricing, setPricing] = useState({ subtotal: 0, discount: 0, total: 0, count: 1 });

  const navigate = useNavigate(); // <-- Added

  // If the payment page is opened with query params, persist them so other
  // pages (and this component) can access the enrollment/course identifiers.
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search || "");
      const qCourseId = params.get('courseId') || params.get('id');
      const qEnrollmentId = params.get('enrollmentId') || params.get('enrollId');
      const qTitle = params.get('title');
      if (qCourseId) {
        window.localStorage.setItem('currentCourseId', qCourseId);
      }
      if (qEnrollmentId) {
        window.localStorage.setItem('currentEnrollmentId', qEnrollmentId);
      }
      if (qTitle) {
        window.localStorage.setItem('currentCourseTitle', qTitle);
      }
    } catch (e) {
      // ignore localStorage errors
    }
  }, []);

  // Load course price and compute discount (40%)
  useEffect(() => {
    let mounted = true;
    const loadPricing = async () => {
      try {
        const courseId = window.localStorage.getItem('currentCourseId');
        if (!courseId) return;
        const res = await fetch(`/api/courses/${courseId}`);
        if (!res.ok) return;
        const body = await res.json();
        const course = body && (body.data || body);
        const price = Number(course?.price ?? 0) || 0;
        const subtotal = price;
        const discount = Math.round(subtotal * 0.4); // 40%
        const total = Math.max(0, subtotal - discount);
        if (mounted) setPricing({ subtotal, discount, total, count: 1 });
      } catch (e) {
        console.warn('Failed to load course for pricing', e);
      }
    };
    loadPricing();
    return () => { mounted = false; };
  }, []);

  const formatCurrency = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    return parts.length ? parts.join(" ") : value;
  };

  const handleCardNumberChange = (e) => {
    setState({
      ...state,
      cardNumber: formatCardNumber(e.target.value),
    });
  };

  const handleExpiryChange = (e) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length >= 2) {
      value = value.slice(0, 2) + "/" + value.slice(2, 4);
    }
    setState({
      ...state,
      expiryDate: value,
    });
  };

  const handleCvvChange = (e) => {
    setState({
      ...state,
      cvv: e.target.value.replace(/\D/g, "").slice(0, 3),
    });
  };

  const handlePaymentMethodChange = (method) => {
    setState({
      ...state,
      paymentMethod: method,
    });
  };

  const handleInputChange = (field, value) => {
    setState({
      ...state,
      [field]: value,
    });
  };

  const handleProceed = () => {
    // Common: ensure a payment method is selected
    if (!state.paymentMethod) {
      alert("Please select a payment method");
      return;
    }

    if (state.paymentMethod === "cards") {
      // Card validations
      if (
        !state.cardNumber ||
        !state.cardholderName ||
        !state.expiryDate ||
        !state.cvv
      ) {
        alert("Please fill in all card details");
        return;
      }

      const digits = state.cardNumber.replace(/\s/g, "");
      if (digits.length < 16) {
        alert("Please enter a valid 16-digit card number");
        return;
      }

      // expiry MM/YY
      const m = state.expiryDate.match(/^(\d{2})\/(\d{2})$/);
      if (!m) {
        alert("Please enter expiry in MM/YY format");
        return;
      }
      const mm = parseInt(m[1], 10);
      const yy = parseInt(m[2], 10);
      if (mm < 1 || mm > 12) {
        alert("Please enter a valid expiry month");
        return;
      }
      // build expiry date at end of month
      const expiry = new Date(2000 + yy, mm, 0, 23, 59, 59);
      const now = new Date();
      if (expiry < now) {
        alert("Card expired. Please use a valid card");
        return;
      }

      // Prevent placeholder names
      const nameTrim = (state.cardholderName || "").trim();
      if (nameTrim.length < 3 || /^john doe$/i.test(nameTrim)) {
        alert("Please enter the cardholder's full name (not placeholder)");
        return;
      }

              // Start processing immediately (non-blocking overlay)
              const details = { method: 'Card', amount: formatCurrency(pricing.total) };
              processPaymentRequest({ method: 'Card', amount: formatCurrency(pricing.total), details });
      return;
    }

    if (state.paymentMethod === "upi") {
      // UPI gateway selection and UPI ID verification required
      if (!state.upiGateway) {
        alert("Please select a UPI gateway (Google Pay, PhonePe or Paytm)");
        return;
      }
      if (!state.upiId) {
        alert("Please enter your UPI ID (example: name@upi)");
        return;
      }
      // basic validation: contains @ and non-empty parts
      const upiParts = state.upiId.split("@");
      if (upiParts.length !== 2 || !upiParts[0] || !upiParts[1]) {
        alert("Please enter a valid UPI ID in the format name@upi");
        return;
      }
      if (!state.upiVerified) {
        alert("Please verify your UPI ID before proceeding");
        return;
      }

          // Start processing immediately (non-blocking overlay)
          const details = { method: `UPI (${state.upiGateway})`, amount: formatCurrency(pricing.total), upi: state.upiId };
          processPaymentRequest({ method: `UPI (${state.upiGateway})`, amount: formatCurrency(pricing.total), details });
      return;
    }

    if (state.paymentMethod === "netbanking") {
      // require email and password
      if (!state.netbankEmail || !state.netbankPassword) {
        alert("Please enter your login email and password for netbanking");
        return;
      }

      // Start processing immediately (non-blocking overlay)
      const details = { method: 'NetBanking', amount: formatCurrency(pricing.total), email: state.netbankEmail };
      processPaymentRequest({ method: 'NetBanking', amount: formatCurrency(pricing.total), details });
      return;
    }

    // default fallback
    alert("Please select a valid payment method and complete the required fields");
  };

  const handleVerifyUpi = () => {
    // Call backend mock verify endpoint
    if (!state.upiId) {
      alert('Enter UPI ID first');
      return;
    }

    axios.post('/api/ai/verify-upi', { upi: state.upiId, gateway: state.upiGateway })
      .then(res => {
        if (res.data?.verified) {
          setState(s => ({ ...s, upiVerified: true, upiVerifiedName: res.data.name }));
          alert(`UPI ID verified for ${res.data.name}`);
        } else {
          alert('UPI verification failed');
        }
      })
      .catch(err => {
        console.error('Verify UPI error', err?.response?.data || err.message);
        const msg = err?.response?.data?.message || 'Failed to verify UPI';
        alert(msg);
      });
  };

  const handleConfirmPayment = () => {
    // Call mock backend to process payment then show success
  };

  // Process payment helper - used for non-blocking Proceed flow
  const processPaymentRequest = async (payload) => {
    try {
      setState(s => ({ ...s, processing: true }));
      const res = await axios.post('/api/ai/process-payment', payload);
      const txId = res.data?.txId;

      // Get courseId from localStorage (set when navigating to payment page)
      const courseId = localStorage.getItem('currentCourseId');
      const enrollmentId = localStorage.getItem('currentEnrollmentId');
      const token = localStorage.getItem('token');
      const amountNumeric = (payload.amount || '₹0').toString().replace(/[^0-9.]/g, '') || '0';

      // 1. Create payment in backend only if we have both a token and a courseId
      if (token && courseId) {
        try {
          const paymentRes = await axios.post('/api/payments', {
            courseId: courseId,
            amount: Number(amountNumeric),
            paymentMethod: payload.method || 'unknown',
            transactionId: txId
          }, { headers: { Authorization: `Bearer ${token}` } });

          // 2. Activate enrollment after successful payment
          if (enrollmentId && paymentRes.data._id) {
            try {
              await axios.post(
                `/api/enrollments/activate/${enrollmentId}`,
                { paymentId: paymentRes.data._id },
                { headers: { Authorization: `Bearer ${token}` } }
              );
              console.log('Enrollment activated successfully');
            } catch (enrollmentErr) {
              console.error('Enrollment activation failed:', enrollmentErr?.response?.data || enrollmentErr.message);
            }
          }
        } catch (err) {
          console.warn('Could not persist payment to backend:', err?.response?.data || err.message);
        }
      } else {
        if (!token) console.warn('Skipping backend payment persist: missing auth token');
        if (!courseId) console.warn('Skipping backend payment persist: missing courseId in localStorage');
      }

      // Show success toast and auto-redirect after short delay
      setState(s => ({ ...s, processing: false, showSuccess: true, confirmDetails: { ...payload.details, txId } }));
      // Auto close/redirect will be handled in effect below
    } catch (err) {
      console.error('Payment error', err?.response?.data || err.message);
      alert('Payment failed. Please try again.');
      setState(s => ({ ...s, processing: false }));
    }
  };

  const handleCloseSuccess = () => {
    // reset form to initial state and close success popup
    const courseId = localStorage.getItem('currentCourseId');
    setState({
      paymentMethod: "cards",
      cardNumber: "",
      cardholderName: "",
      expiryDate: "",
      cvv: "",
      walletOption: "",
      upiGateway: "",
      upiId: "",
      upiVerified: false,
      upiVerifiedName: '',
      netbankEmail: "",
      netbankPassword: "",
      showConfirm: false,
      showSuccess: false,
      confirmDetails: null,
    });
    
    // Don't remove the stored course/enrollment identifiers here — keep them so the
    // Courses page can poll the backend (or use the enrollment id) to confirm
    // activation. Set the optimistic justPaid flag and navigate to courses.
    try { window.localStorage.setItem('justPaid', '1'); } catch (e) {}
    if (courseId) {
      navigate(`/courses?id=${courseId}`);
    } else {
      // If we don't have a courseId, send user to the general courses listing
      navigate('/courses');
    }
  };

  // Auto-redirect when payment success shown
  React.useEffect(() => {
    if (state.showSuccess) {
      const timer = setTimeout(() => {
        handleCloseSuccess();
      }, 2200);
      return () => clearTimeout(timer);
    }
  }, [state.showSuccess]);

  return (
    <AppLayout showGreeting={false}>
      <div className="checkout-container">
        <div className="checkout-wrapper">
          <button
            className="back-button"
            onClick={() => navigate("/courses")} // <-- navigate to courses list
          >
            ← Back to Courses
          </button>

          <div className="checkout-content">
            {/* Left Section - Payment Form */}
            <div className="payment-section">
              <div className="payment-card">
                <div className="payment-header">
                  <h1 className="payment-title">Payment method</h1>
                  <div className="secure-badge">
                    <span>Secure and encrypted</span>
                    <Lock className="lock-icon" />
                  </div>
                </div>

                {/* Cards Option */}
                <div className="payment-option active-option">
                  <label className="option-label">
                    <div className="option-left">
                      <input
                        type="radio"
                        name="payment"
                        value="cards"
                        checked={state.paymentMethod === "cards"}
                        onChange={(e) =>
                          handlePaymentMethodChange(e.target.value)
                        }
                        className="radio-input"
                      />
                      <CreditCard className="option-icon" />
                      <span className="option-text">Cards</span>
                    </div>
                    <div className="card-logos">
                      <div className="logo-payment visa-logo">VISA</div>
                      <div className="logo-payment mastercard-logo">MASTER</div>
                      <div className="logo-payment amex-logo">AMEX</div>
                      <div className="logo-payment rupay-logo">RUPAY</div>
                    </div>
                  </label>
                </div>

                {/* Card Form */}
                {state.paymentMethod === "cards" && (
                  <div className="card-form">
                          <span className="price-label" style={{color:'black'}}>Original Price:</span>
                          <span className="price-value">{formatCurrency(pricing.subtotal)}</span>
                        </div>
                        <div className="price-row">
                          <span className="price-label" style={{color:'black'}}>Discounts (40% Off):</span>
                          <span className="price-value discount">-{formatCurrency(pricing.discount)}</span>
                        </div>
                      </div>

                      <div className="price-divider"></div>

                      <div className="total-section">
                        <div className="total-row">
                          <span className="total-label">Total ({pricing.count} course{pricing.count>1? 's':''}):</span>
                          <span className="total-amount">{formatCurrency(pricing.total)}</span>
                        </div>
                      </div>
                          handleInputChange("cardholderName", e.target.value)
                        }
                        className="form-input"
                      />
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Expiry Date</label>
                        <input
                          type="text"
                          placeholder="MM/YY"
                          value={state.expiryDate}
                          onChange={handleExpiryChange}
                          maxLength={5}
                          className="form-input"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">CVV</label>
                        <input
                          type="text"
                          placeholder="123"
                          value={state.cvv}
                          onChange={handleCvvChange}
                          maxLength={3}
                          className="form-input"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* UPI Option */}
                <div className="payment-option ">
                  <label className="option-label">
                    <div className="option-left">
                      <input
                        type="radio"
                        name="payment"
                        value="upi"
                        checked={state.paymentMethod === "upi"}
                        onChange={(e) =>
                          handlePaymentMethodChange(e.target.value)
                        }
                        className="radio-input"
                      />
                      <Building2 className="option-icon" />
                      <div className="option-text-group">
                        <span className="option-text">UPI</span>
                      </div>
                    </div>
                  </label>
                </div>

                {/* UPI Gateways and input */}
                {state.paymentMethod === "upi" && (
                  <div className="upi-section">
                    <div className="gateway-options">
                      <div
                        className={`gateway ${state.upiGateway === 'googlepay' ? 'selected' : ''}`}
                        onClick={() => handleInputChange('upiGateway', 'googlepay')}
                      >
                        Google Pay
                      </div>
                      <div
                        className={`gateway ${state.upiGateway === 'phonepe' ? 'selected' : ''}`}
                        onClick={() => handleInputChange('upiGateway', 'phonepe')}
                      >
                        PhonePe
                      </div>
                      <div
                        className={`gateway ${state.upiGateway === 'paytm' ? 'selected' : ''}`}
                        onClick={() => handleInputChange('upiGateway', 'paytm')}
                      >
                        Paytm
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Enter UPI ID</label>
                      <input
                        type="text"
                        placeholder="name@upi"
                        value={state.upiId}
                        onChange={(e) => handleInputChange('upiId', e.target.value)}
                        className="form-input"
                      />
                    </div>

                    <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
                      <button className="verify-button" onClick={handleVerifyUpi}>Verify UPI</button>
                      <div style={{ alignSelf: 'center' }}>{state.upiVerified ? `Verified: ${state.upiVerifiedName}` : ''}</div>
                    </div>
                  </div>
                )}

                {/* Net Banking Option */}
                <div className="payment-option">
                  <label className="option-label">
                    <div className="option-left">
                      <input
                        type="radio"
                        name="payment"
                        value="netbanking"
                        checked={state.paymentMethod === "netbanking"}
                        onChange={(e) =>
                          handlePaymentMethodChange(e.target.value)
                        }
                        className="radio-input"
                      />
                      <Building2 className="option-icon bank-icon" />
                      <span className="option-text">Net Banking</span>
                    </div>
                  </label>
                </div>

                {/* Net Banking Credentials (removed wallet options) */}
                {state.paymentMethod === "netbanking" && (
                  <div className="netbanking-form">
                    <div className="form-group">
                      <label className="form-label">Email (login)</label>
                      <input
                        type="email"
                        placeholder="you@example.com"
                        value={state.netbankEmail}
                        onChange={(e) => handleInputChange('netbankEmail', e.target.value)}
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Password</label>
                      <input
                        type="password"
                        placeholder="Enter your banking password"
                        value={state.netbankPassword}
                        onChange={(e) => handleInputChange('netbankPassword', e.target.value)}
                        className="form-input"
                      />
                    </div>
                  </div>
                )}

                {/* Mobile Wallets option removed per requirements */}
              </div>
            </div>

            {/* Right Section - Summary */}
            <div className="summary-section">
              <div className="summary-card">
                <h2 className="summary-title">Order summary</h2>

                <div className="price-details">
                  <div className="price-row">
                    <span className="price-label">Original Price:</span>
                    <span className="price-value">{formatCurrency(pricing.subtotal)}</span>
                  </div>
                  <div className="price-row">
                    <span className="price-label">Discounts (40% Off):</span>
                    <span className="price-value discount">-{formatCurrency(pricing.discount)}</span>
                  </div>
                </div>

                <div className="price-divider"></div>

                <div className="total-section">
                  <div className="total-row">
                    <span className="total-label">Total ({pricing.count} course{pricing.count>1? 's':''}):</span>
                    <span className="total-amount">{formatCurrency(pricing.total)}</span>
                  </div>
                </div>

                <p className="terms-text">
                  By completing your purchase, you agree to these{" "}
                  <a href="#" className="terms-link">
                    Terms of Use
                  </a>
                </p>

                <button className="proceed-button" onClick={handleProceed}>
                  <Lock className="button-icon" />
                  Proceed
                </button>

                {/* Confirmation modal */}
                {state.showConfirm && (
                  <div className="modal-overlay">
                    <div className="modal">
                      <h3>Confirm Payment</h3>
                      <p>Method: {state.confirmDetails?.method}</p>
                      <p>Amount: {state.confirmDetails?.amount}</p>
                      {state.confirmDetails?.upi && <p>UPI: {state.confirmDetails.upi}</p>}
                      {state.confirmDetails?.email && <p>Email: {state.confirmDetails.email}</p>}
                      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        <button onClick={() => setState(s => ({ ...s, showConfirm: false }))}>Cancel</button>
                        <button onClick={handleConfirmPayment}>Confirm Payment</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Success toast (small, auto-dismiss) */}
                {state.showSuccess && (
                  <div className="payment-success-toast" aria-live="polite">
                    <div className="toast-content">
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width={20} height={20}>
                        <path d="M20 6L9 17l-5-5" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <div style={{ marginLeft: 8 }}>
                        <div style={{ fontWeight: 600 }}>Payment Successful</div>
                        <div style={{ fontSize: 13 }}>{`You paid ${state.confirmDetails?.amount || formatCurrency(pricing.total)}. Redirecting...`}</div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="success-banner">
                  <div className="banner-header">
                    <TrendingUp className="banner-icon" />
                    <span className="banner-title">Tap into Success Now</span>
                  </div>
                  <p className="banner-text">
                    Join 30+ people in your country who've recently enrolled in
                    this course within last 24 hours
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default PaymentInterface;
