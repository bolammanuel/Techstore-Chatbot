import React, { useState, useEffect, useMemo } from 'react';
import Layout from './components/Layout';
import Hero from './components/Hero';
import ProductCard from './components/ProductCard';
import ProductDetail from './components/ProductDetail';
import Cart from './components/Cart';
import Wishlist from './components/Wishlist';
import HelpCenter from './components/HelpCenter';
import ChatBot from './components/ChatBot';
import { Product, CartItem, Category, View, SortOption, Review, Order, OrderStatus, CheckoutStep } from './types';
import { MOCK_PRODUCTS, VAT_RATE } from './constants';
import { ChevronRight, CheckCircle2, ShieldCheck, Truck, CreditCard, ArrowLeft, Loader2, SlidersHorizontal, Search, MapPin, Package, Clock, CreditCard as CardIcon } from 'lucide-react';
import PaystackPop from "@paystack/inline-js";

const App: React.FC = () => {
  const [view, setView] = useState<View>(View.HOME);
  const [activeCategory, setActiveCategory] = useState<Category>('All');
  const [sortBy, setSortBy] = useState<SortOption>('recommended');
  const [searchQuery, setSearchQuery] = useState('');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>(CheckoutStep.INFO);
  const [paymentGateway, setPaymentGateway] = useState<'paystack' | 'stripe' | 'paypal'>('paystack');
  const [trackingId, setTrackingId] = useState('');
  const [trackedOrder, setTrackedOrder] = useState<Order | null>(null);
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const calculateTotals = () => {
    const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const vat = subtotal * VAT_RATE;
    const total = subtotal + vat;
    return { subtotal, vat, total };
  };

const handlePaystackSuccess = (reference: unknown) => {
    const newOrder: Order = {
      id: `TS-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      items: [...cartItems],
      total: calculateTotals().total,
      status: OrderStatus.PLACED,
      date: new Date().toLocaleDateString(),
      email: email
    };
    setOrders(prev => [newOrder, ...prev]);
    setLastOrder(newOrder);
    setIsProcessing(false);
    setView(View.CONFIRMATION);
    setCartItems([]);
    setCheckoutStep(CheckoutStep.INFO);
    setEmail('');
    setFirstName('');
    setLastName('');
  };

  const handlePaystackClose = () => {
    setIsProcessing(false);
  };

  const startPaystackPayment = () => {
  const paystack = new PaystackPop();

  paystack.newTransaction({
    key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
    email: email,
    amount: Math.round(calculateTotals().total * 100),
    reference: new Date().getTime().toString(),

    onSuccess(transaction: any) {
      handlePaystackSuccess(transaction);
    },

    onCancel() {
      handlePaystackClose();
    }
  });
};

  // Persistence
  useEffect(() => {
    const savedCart = localStorage.getItem('techstore_cart');
    const savedWishlist = localStorage.getItem('techstore_wishlist');
    const savedReviews = localStorage.getItem('techstore_reviews');
    const savedOrders = localStorage.getItem('techstore_orders');
    if (savedCart) setCartItems(JSON.parse(savedCart));
    if (savedWishlist) setWishlistIds(JSON.parse(savedWishlist));
    if (savedReviews) setReviews(JSON.parse(savedReviews));
    if (savedOrders) setOrders(JSON.parse(savedOrders));
  }, []);

  useEffect(() => {
    localStorage.setItem('techstore_cart', JSON.stringify(cartItems));
    localStorage.setItem('techstore_wishlist', JSON.stringify(wishlistIds));
    localStorage.setItem('techstore_reviews', JSON.stringify(reviews));
    localStorage.setItem('techstore_orders', JSON.stringify(orders));
  }, [cartItems, wishlistIds, reviews, orders]);

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const wishlistItems = useMemo(() => MOCK_PRODUCTS.filter(p => wishlistIds.includes(p.id)), [wishlistIds]);

  const filteredAndSortedProducts = useMemo(() => {
    let result = [...MOCK_PRODUCTS];
    if (activeCategory !== 'All') result = result.filter(p => p.category === activeCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
    }
    switch (sortBy) {
      case 'price_asc': result.sort((a, b) => a.price - b.price); break;
      case 'price_desc': result.sort((a, b) => b.price - a.price); break;
      case 'rating': result.sort((a, b) => b.rating - a.rating); break;
    }
    return result;
  }, [activeCategory, searchQuery, sortBy]);

  const handleAddToCart = (product: Product) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      return [...prev, { ...product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const handleToggleWishlist = (id: string) => {
    setWishlistIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleAddReview = (reviewData: Omit<Review, 'id' | 'date'>) => {
    const newReview: Review = {
      ...reviewData,
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toLocaleDateString()
    };
    setReviews(prev => [newReview, ...prev]);
  };

const handleProcessPayment = (e: React.FormEvent) => {
  e.preventDefault();

  if (paymentGateway === 'paystack') {
    if (!import.meta.env.VITE_PAYSTACK_PUBLIC_KEY) {
      alert('Paystack Public Key is missing.');
      return;
    }

    setIsProcessing(true);
    startPaystackPayment();

  } else {
    setIsProcessing(true);

    setTimeout(() => {
      const newOrder: Order = {
        id: `TS-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        items: [...cartItems],
        total: calculateTotals().total,
        status: OrderStatus.PLACED,
        date: new Date().toLocaleDateString(),
        email: email || 'customer@example.com'
      };

      setOrders(prev => [newOrder, ...prev]);
      setLastOrder(newOrder);
      setIsProcessing(false);
      setView(View.CONFIRMATION);
      setCartItems([]);
    }, 2000);
  }
};

  const handleTrackOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const order = orders.find(o => o.id === trackingId.toUpperCase());
    setTrackedOrder(order || null);
    if (!order) alert('Order not found. Please check your ID.');
  };

  return (
    <Layout 
      cartCount={cartCount} wishlistCount={wishlistIds.length}
      onOpenCart={() => setIsCartOpen(true)} onOpenWishlist={() => setIsWishlistOpen(true)}
      onNavigateHome={() => setView(View.HOME)} onNavigateTrack={() => setView(View.TRACK_ORDER)}
      onNavigateHelp={() => setView(View.HELP_CENTER)}
      activeCategory={activeCategory} setActiveCategory={setActiveCategory}
      searchQuery={searchQuery} setSearchQuery={setSearchQuery}
    >
      {view === View.HOME && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <Hero onShopNow={() => {
            const el = document.getElementById('discovery');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }} />
          <div id="discovery" className="flex justify-between items-center mb-10 border-b border-slate-100 pb-8">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Discovery</h2>
            <div className="flex items-center gap-4">
               <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)} className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700">
                 <option value="recommended">Recommended</option>
                 <option value="price_asc">Price: Low to High</option>
                 <option value="price_desc">Price: High to Low</option>
                 <option value="rating">Top Rated</option>
               </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {filteredAndSortedProducts.map(product => (
              <ProductCard 
                key={product.id} product={product} 
                onAddToCart={handleAddToCart} onViewDetail={(id) => { setSelectedProductId(id); setView(View.PRODUCT_DETAIL); }}
                onToggleWishlist={handleToggleWishlist} isWishlisted={wishlistIds.includes(product.id)}
              />
            ))}
          </div>
        </div>
      )}

      {view === View.PRODUCT_DETAIL && selectedProductId && (
        <ProductDetail 
          product={MOCK_PRODUCTS.find(p => p.id === selectedProductId)!}
          allProducts={MOCK_PRODUCTS}
          onBack={() => setView(View.HOME)}
          onAddToCart={handleAddToCart}
          onViewDetail={(id) => { setSelectedProductId(id); setView(View.PRODUCT_DETAIL); window.scrollTo(0,0); }}
          onToggleWishlist={handleToggleWishlist}
          isWishlisted={wishlistIds.includes(selectedProductId)}
          reviews={reviews.filter(r => r.productId === selectedProductId)}
          onAddReview={handleAddReview}
        />
      )}

      {view === View.HELP_CENTER && (
        <HelpCenter onBack={() => setView(View.HOME)} onOpenChat={() => setIsChatOpen(true)} />
      )}

      {view === View.TRACK_ORDER && (
        <div className="max-w-3xl mx-auto px-4 py-20">
          <h2 className="text-3xl font-black text-slate-900 mb-8 text-center">Track Your Order</h2>
          <form onSubmit={handleTrackOrder} className="flex gap-2 mb-12">
            <input 
              value={trackingId} onChange={(e) => setTrackingId(e.target.value)}
              placeholder="Enter Order ID (e.g. TS-ABC123XYZ)" 
              className="flex-1 px-6 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#137fec] font-bold"
            />
            <button className="px-8 py-4 bg-slate-900 text-white font-bold rounded-2xl">Track</button>
          </form>

          {trackedOrder && (
            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl shadow-slate-200/50 space-y-8 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-6">
                <div>
                  <div className="text-xs text-slate-400 font-bold uppercase tracking-widest">Order Status</div>
                  <div className="text-2xl font-black text-[#137fec]">{trackedOrder.status}</div>
                </div>
                <div className="text-right">
                   <div className="text-xs text-slate-400 font-bold uppercase tracking-widest">Expected Delivery</div>
                   <div className="font-bold text-slate-900">3-5 Business Days</div>
                </div>
              </div>
              <div className="relative pt-8">
                 <div className="absolute top-10 left-0 right-0 h-1 bg-slate-100 rounded-full"></div>
                 <div className="absolute top-10 left-0 h-1 bg-[#137fec] rounded-full" style={{ width: trackedOrder.status === OrderStatus.PLACED ? '25%' : '50%' }}></div>
                 <div className="flex justify-between relative">
                    {[OrderStatus.PLACED, OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.DELIVERED].map((s, idx) => (
                      <div key={s} className="flex flex-col items-center gap-2">
                        <div className={`w-6 h-6 rounded-full border-4 flex items-center justify-center ${trackedOrder.status === s ? 'bg-[#137fec] border-blue-100' : 'bg-white border-slate-100'}`}>
                          {trackedOrder.status === s && <div className="w-2 h-2 bg-white rounded-full"></div>}
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">{s}</span>
                      </div>
                    ))}
                 </div>
              </div>
            </div>
          )}
        </div>
      )}

      {view === View.CHECKOUT && (
        <div className="max-w-7xl mx-auto px-4 py-12">
          {/* Stepper */}
          <div className="flex items-center justify-center gap-4 mb-16">
            {[CheckoutStep.INFO, CheckoutStep.SHIPPING, CheckoutStep.PAYMENT].map(step => (
              <React.Fragment key={step}>
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${checkoutStep >= step ? 'bg-[#137fec] text-white' : 'bg-slate-200 text-slate-500'}`}>{step}</div>
                  <span className={`text-sm font-bold ${checkoutStep >= step ? 'text-slate-900' : 'text-slate-400'}`}>{step === 1 ? 'Info' : step === 2 ? 'Shipping' : 'Payment'}</span>
                </div>
                {step < 3 && <div className={`w-12 h-0.5 rounded-full ${checkoutStep > step ? 'bg-[#137fec]' : 'bg-slate-200'}`}></div>}
              </React.Fragment>
            ))}
          </div>

          <div className="grid lg:grid-cols-5 gap-16">
            <div className="lg:col-span-3">
              <form onSubmit={handleProcessPayment}>
                {checkoutStep === CheckoutStep.INFO && (
                  <div className="space-y-8 animate-in fade-in">
                    <h2 className="text-2xl font-black text-slate-900">Personal Information</h2>
                    <div className="grid grid-cols-2 gap-4">
                      <input required value={firstName} onChange={(e) => setFirstName(e.target.value)} className="col-span-1 px-4 py-3 bg-white border border-slate-200 rounded-xl" placeholder="First Name" />
                      <input required value={lastName} onChange={(e) => setLastName(e.target.value)} className="col-span-1 px-4 py-3 bg-white border border-slate-200 rounded-xl" placeholder="Last Name" />
                      <input required value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="col-span-2 px-4 py-3 bg-white border border-slate-200 rounded-xl" placeholder="Email Address" />
                    </div>
                    <button type="button" onClick={() => setCheckoutStep(CheckoutStep.SHIPPING)} className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl">Continue to Shipping</button>
                  </div>
                )}

                {checkoutStep === CheckoutStep.SHIPPING && (
                  <div className="space-y-8 animate-in fade-in">
                    <h2 className="text-2xl font-black text-slate-900">Shipping Details</h2>
                    <div className="grid grid-cols-2 gap-4">
                      <input required className="col-span-2 px-4 py-3 bg-white border border-slate-200 rounded-xl" placeholder="Full Address" />
                      <input required className="col-span-1 px-4 py-3 bg-white border border-slate-200 rounded-xl" placeholder="City" />
                      <input required className="col-span-1 px-4 py-3 bg-white border border-slate-200 rounded-xl" placeholder="Postal Code" />
                    </div>
                    <div className="flex gap-4">
                      <button type="button" onClick={() => setCheckoutStep(CheckoutStep.INFO)} className="w-1/3 py-4 bg-slate-100 text-slate-900 font-bold rounded-2xl">Back</button>
                      <button type="button" onClick={() => setCheckoutStep(CheckoutStep.PAYMENT)} className="w-2/3 py-4 bg-slate-900 text-white font-bold rounded-2xl">Continue to Payment</button>
                    </div>
                  </div>
                )}

                {checkoutStep === CheckoutStep.PAYMENT && (
                  <div className="space-y-8 animate-in fade-in">
                    <h2 className="text-2xl font-black text-slate-900">Payment Gateway</h2>
                    <div className="space-y-4">
                       {[
                         { id: 'paystack', label: 'Paystack', icon: <Package size={18} /> },
                         { id: 'stripe', label: 'Stripe', icon: <CardIcon size={18} /> },
                         { id: 'paypal', label: 'PayPal', icon: <CreditCard size={18} /> }
                       ].map(gw => (
                         <div key={gw.id} onClick={() => setPaymentGateway(gw.id as any)} className={`p-6 rounded-2xl border-2 cursor-pointer flex justify-between items-center transition-all ${paymentGateway === gw.id ? 'border-[#137fec] bg-blue-50' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                            <div className="flex items-center gap-4">
                               <div className={`p-3 rounded-xl ${paymentGateway === gw.id ? 'bg-[#137fec] text-white' : 'bg-slate-50 text-slate-400'}`}>{gw.icon}</div>
                               <span className="font-bold text-slate-900">{gw.label}</span>
                            </div>
                            <div className={`w-6 h-6 rounded-full border-4 ${paymentGateway === gw.id ? 'border-[#137fec] bg-white' : 'border-slate-100'}`}></div>
                         </div>
                       ))}
                    </div>
                    <div className="flex gap-4">
                      <button type="button" onClick={() => setCheckoutStep(CheckoutStep.SHIPPING)} className="w-1/3 py-4 bg-slate-100 text-slate-900 font-bold rounded-2xl text-sm">Back</button>
                      <button type="submit" disabled={isProcessing} className="w-2/3 py-4 bg-[#137fec] text-white font-black rounded-2xl shadow-xl shadow-blue-500/30 flex items-center justify-center gap-3">
                        {isProcessing ? <Loader2 className="animate-spin" /> : <>Pay and Place Order <ShieldCheck size={20} /></>}
                      </button>
                    </div>
                  </div>
                )}
              </form>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-white border border-slate-100 rounded-3xl p-8 sticky top-32 space-y-6 shadow-xl">
                <h3 className="text-xl font-black text-slate-900">Summary</h3>
                <div className="space-y-4 max-h-[200px] overflow-y-auto pr-2 scrollbar-hide">
                  {cartItems.map(item => (
                    <div key={item.id} className="flex justify-between items-center text-sm">
                      <span className="text-slate-600 truncate mr-4">{item.name} x {item.quantity}</span>
                      <span className="font-bold text-slate-900 shrink-0">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-6 border-t border-slate-100 flex justify-between text-2xl font-black text-slate-900">
                  <span>Total</span>
                  <span>${calculateTotals().total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {view === View.CONFIRMATION && lastOrder && (
        <div className="max-w-2xl mx-auto py-24 text-center px-4">
          <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce"><CheckCircle2 size={48} /></div>
          <h2 className="text-4xl font-black text-slate-900 mb-4">Order Confirmed!</h2>
          <p className="text-slate-500 mb-10 text-lg">Thank you. Your order ID is <span className="text-[#137fec] font-bold">{lastOrder.id}</span>. Save this ID to track your shipment.</p>
          <div className="flex justify-center gap-4">
            <button onClick={() => setView(View.HOME)} className="px-8 py-4 bg-slate-900 text-white font-bold rounded-2xl">Return Home</button>
            <button onClick={() => { setTrackingId(lastOrder.id); handleTrackOrder({ preventDefault: () => {} } as any); setView(View.TRACK_ORDER); }} className="px-8 py-4 bg-slate-100 text-slate-900 font-bold rounded-2xl">Track Shipment</button>
          </div>
        </div>
      )}

      <Cart 
        isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} 
        items={cartItems} onUpdateQuantity={(id, d) => setCartItems(prev => prev.map(i => i.id === id ? {...i, quantity: Math.max(1, i.quantity + d)} : i))}
        onRemoveItem={(id) => setCartItems(prev => prev.filter(i => i.id !== id))}
        onCheckout={() => { setView(View.CHECKOUT); setIsCartOpen(false); }}
      />
      <Wishlist 
        isOpen={isWishlistOpen} onClose={() => setIsWishlistOpen(false)} 
        items={wishlistItems} onRemoveItem={handleToggleWishlist} onAddToCart={handleAddToCart}
      />
      <ChatBot 
        isOpen={isChatOpen} 
        onOpen={() => setIsChatOpen(true)} 
        onClose={() => setIsChatOpen(false)} 
        onAddToCart={handleAddToCart}
      />
    </Layout>
  );
};

export default App;
