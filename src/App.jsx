import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:3001/api';

export default function App() {
  const [account, setAccount] = useState('');
  const [dummyUsers, setDummyUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  
  const [activeTab, setActiveTab] = useState('marketplace');
  
  const [newName, setNewName] = useState('');
  const [newImage, setNewImage] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newStock, setNewStock] = useState(1);
  
  // Track selected quantity for each product by ID
  const [buyQuantities, setBuyQuantities] = useState({});

  useEffect(() => {
    fetchUsers();
    fetchProducts();
    fetchOrders();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_URL}/accounts`);
      setDummyUsers(await response.json());
    } catch (err) {
      console.error(err);
      setError("Failed to connect to backend");
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API_URL}/products`);
      setProducts(await response.json());
    } catch (err) {
      console.error(err);
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await fetch(`${API_URL}/orders`);
      setOrders(await response.json());
    } catch (err) {
      console.error(err);
    }
  };

  const handleListProduct = async (e) => {
    e.preventDefault();
    if (!account) return setError("Please select a user first");
    try {
      setLoading(true); setError('');
      const res = await fetch(`${API_URL}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, imageHash: newImage, price: newPrice, seller: account, stock: newStock })
      });
      if (!res.ok) throw new Error(await res.text());
      
      setSuccess("Product listed successfully!");
      setShowAddModal(false);
      setNewName(''); setNewImage(''); setNewPrice(''); setNewStock(1);
      await fetchProducts();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to list product');
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = (productId, val, maxStock) => {
    const qty = parseInt(val);
    if (isNaN(qty) || qty < 1) return;
    if (qty > maxStock) return;
    setBuyQuantities(prev => ({ ...prev, [productId]: qty }));
  };

  const buyProduct = async (id, price) => {
    if (!account) return setError("Please select a user first");
    const quantity = buyQuantities[id] || 1;
    
    try {
      setLoading(true); setError('');
      setSuccess(`Processing bulk purchase of ${quantity} items...`);
      
      const res = await fetch(`${API_URL}/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: id, buyerAddress: account, quantity })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setSuccess("Purchase successful! Funds locked securely in Escrow.");
      
      // Reset the quantity input for this product
      setBuyQuantities(prev => ({ ...prev, [id]: 1 }));
      
      await fetchProducts();
      await fetchOrders();
      await fetchUsers();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message || 'Purchase failed');
      setSuccess('');
    } finally {
      setLoading(false);
    }
  };

  const confirmDelivery = async (orderId) => {
    if (!account) return;
    try {
      setLoading(true); setError('');
      setSuccess("Telling backend to release funds...");
      
      const res = await fetch(`${API_URL}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, buyerAddress: account })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccess("Delivery confirmed! Funds released to seller.");
      await fetchOrders();
      await fetchUsers();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message || 'Confirmation failed');
      setSuccess('');
    } finally {
      setLoading(false);
    }
  };

  const selectedUser = dummyUsers.find(u => u.address === account);

  // Tab Filtering
  const myPurchases = orders.filter(o => o.buyer.toLowerCase() === account.toLowerCase());
  const myProducts = products.filter(p => p.seller.toLowerCase() === account.toLowerCase());
  const mySales = orders.filter(o => o.seller.toLowerCase() === account.toLowerCase());

  return (
    <div className="min-h-screen bg-[#0a0f1c] text-slate-200 font-sans p-4 sm:p-6 selection:bg-purple-500/30">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <header className="flex flex-col md:flex-row justify-between items-center bg-slate-900/60 backdrop-blur-xl p-6 rounded-3xl shadow-2xl border border-slate-700/50">
          <div className="mb-4 md:mb-0 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
            </div>
            <div>
              <h1 className="text-3xl font-extrabold bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent tracking-tight">
                NexusMarket
              </h1>
              <p className="text-slate-400 text-sm font-medium">Enterprise Web 2.0 Platform</p>
            </div>
          </div>
          
          <div className="flex gap-4 items-center">
            {account && activeTab === 'dashboard' && (
              <button 
                onClick={() => setShowAddModal(true)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold rounded-xl border border-slate-600 transition-all shadow-md active:scale-95 animate-in zoom-in duration-300"
              >
                + List Product
              </button>
            )}

            {selectedUser && (
              <div className="bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700/50 flex items-center gap-2 shadow-inner">
                  <span className="text-sm font-medium text-slate-400">Balance:</span>
                  <span className="text-sm font-bold text-cyan-400">{selectedUser.balance} ETH</span>
              </div>
            )}
            
            <div className="flex items-center gap-3 bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700/50 shadow-inner">
              <span className="text-sm font-medium text-slate-400">Login As:</span>
              <select 
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                className="bg-slate-900 border border-slate-600 text-white text-sm rounded-lg px-3 py-1.5 focus:ring-purple-500 focus:border-purple-500 outline-none cursor-pointer"
              >
                <option value="">-- Guest --</option>
                {dummyUsers.map(user => (
                  <option key={user.address} value={user.address}>
                    {user.name} {user.balance ? `(${user.balance} ETH)` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>

        {account && (
          <div className="flex justify-center">
            <div className="bg-slate-900/60 backdrop-blur-xl p-1.5 rounded-2xl border border-slate-700/50 inline-flex shadow-xl">
              <button onClick={() => setActiveTab('marketplace')} className={`px-6 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 ${activeTab === 'marketplace' ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}>🛒 Marketplace</button>
              <button onClick={() => setActiveTab('purchases')} className={`px-6 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 ${activeTab === 'purchases' ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}>📦 My Purchases</button>
              <button onClick={() => setActiveTab('dashboard')} className={`px-6 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 ${activeTab === 'dashboard' ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}>🏪 Seller Dashboard</button>
            </div>
          </div>
        )}

        <div className="fixed top-6 right-6 z-50 flex flex-col gap-3">
          {error && (
            <div className="p-4 bg-red-900/90 backdrop-blur-md border border-red-500/50 rounded-2xl text-red-100 flex items-center shadow-2xl animate-in slide-in-from-right-8 max-w-sm">
              <p className="font-medium text-sm break-words">{error}</p>
            </div>
          )}
          {success && (
            <div className="p-4 bg-emerald-900/90 backdrop-blur-md border border-emerald-500/50 rounded-2xl text-emerald-100 flex items-center shadow-2xl animate-in slide-in-from-right-8 max-w-sm">
              <p className="font-medium text-sm break-words">{success}</p>
            </div>
          )}
        </div>

        {/* View Router */}
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
          
          {/* MARKETPLACE VIEW */}
          {activeTab === 'marketplace' && (
            <>
              <div className="flex justify-between items-end mb-6 border-b border-slate-800 pb-4">
                <h2 className="text-2xl font-bold text-white">Marketplace</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map(product => {
                  const isSeller = account.toLowerCase() === product.seller.toLowerCase();
                  const qty = buyQuantities[product.id] || 1;
                  return (
                    <div key={product.id} className="bg-slate-900/60 rounded-3xl overflow-hidden border border-slate-700/50 shadow-xl group flex flex-col">
                      <div className="h-48 relative bg-slate-800">
                        <img src={product.imageHash} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        <div className="absolute top-3 right-3 flex flex-col gap-2">
                          {product.stock > 0 ? (
                            <span className="bg-slate-900/90 text-purple-400 text-xs font-bold px-3 py-1.5 rounded-full border border-purple-500/30">In Stock: {product.stock}</span>
                          ) : (
                            <span className="bg-slate-900/90 text-red-400 text-xs font-bold px-3 py-1.5 rounded-full border border-red-500/30">Sold Out</span>
                          )}
                        </div>
                      </div>
                      <div className="p-5 flex flex-col flex-1">
                        <h3 className="text-xl font-bold text-white mb-1">{product.name}</h3>
                        <p className="text-2xl font-mono text-cyan-400 font-semibold mb-4">{product.price} <span className="text-sm text-slate-500">ETH</span></p>
                        
                        <div className="mt-auto">
                          {product.stock > 0 && account && !isSeller && (
                            <div className="flex items-center gap-3 mb-3 bg-slate-950 p-2 rounded-xl border border-slate-800">
                              <span className="text-sm text-slate-400 ml-2">Qty:</span>
                              <input 
                                type="number" 
                                min="1" 
                                max={product.stock}
                                value={qty}
                                onChange={(e) => updateQuantity(product.id, e.target.value, product.stock)}
                                className="w-full bg-transparent text-white font-mono outline-none text-right pr-2"
                              />
                            </div>
                          )}
                          <button 
                            onClick={() => buyProduct(product.id, product.price)}
                            disabled={!account || product.stock <= 0 || isSeller}
                            className={`w-full py-3 rounded-xl font-bold transition-all ${
                              product.stock <= 0 || isSeller ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' :
                              !account ? 'bg-slate-800 text-slate-500 cursor-not-allowed' :
                              'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg active:scale-95'
                            }`}
                          >
                            {product.stock <= 0 ? 'Sold Out' : isSeller ? 'Your Item' : !account ? 'Select User to Buy' : `Buy ${qty} for ${(qty * parseFloat(product.price)).toLocaleString('fullwide', {maximumFractionDigits:4})} ETH`}
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* PURCHASES VIEW */}
          {activeTab === 'purchases' && (
            <>
              <div className="flex justify-between items-end mb-6 border-b border-slate-800 pb-4">
                <h2 className="text-2xl font-bold text-white">My Purchases</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {myPurchases.map(order => (
                  <div key={order.orderId} className="bg-slate-900/60 rounded-3xl overflow-hidden border border-slate-700/50 shadow-xl flex flex-col">
                    <div className="h-48 relative bg-slate-800">
                      <img src={order.imageHash} className="w-full h-full object-cover" />
                      <div className="absolute top-3 right-3">
                        {order.isDelivered ? (
                          <span className="bg-slate-900/90 text-emerald-400 text-xs font-bold px-3 py-1.5 rounded-full border border-emerald-500/30">Delivered</span>
                        ) : (
                          <span className="bg-slate-900/90 text-amber-400 text-xs font-bold px-3 py-1.5 rounded-full border border-amber-500/30">In Transit</span>
                        )}
                      </div>
                    </div>
                    <div className="p-5 flex flex-col flex-1">
                      <h3 className="text-xl font-bold text-white mb-1">{order.name} <span className="text-slate-400 text-sm font-normal">(x{order.quantity})</span></h3>
                      <p className="text-lg font-mono text-cyan-400 mb-4">Total: {(order.quantity * parseFloat(order.price)).toLocaleString('fullwide', {maximumFractionDigits:4})} ETH</p>
                      <p className="text-xs font-mono text-slate-400 truncate mb-4">Escrow: {order.escrowAddress}</p>
                      <div className="mt-auto">
                        <button 
                          onClick={() => confirmDelivery(order.orderId)}
                          disabled={order.isDelivered || loading}
                          className={`w-full py-3 rounded-xl font-bold transition-all ${
                            order.isDelivered ? 'bg-slate-900 text-emerald-600 border border-emerald-900/50 cursor-not-allowed' :
                            'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg'
                          }`}
                        >
                          {order.isDelivered ? 'Transaction Complete' : 'Confirm Delivery'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* DASHBOARD VIEW */}
          {activeTab === 'dashboard' && (
            <div className="space-y-12">
              <div>
                <h2 className="text-2xl font-bold text-white border-b border-slate-800 pb-4 mb-6">Store Inventory</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {myProducts.map(product => (
                    <div key={product.id} className="bg-slate-900/60 p-5 rounded-3xl border border-slate-700/50">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-white">{product.name}</h3>
                        <span className="text-xs bg-purple-900/50 text-purple-400 px-2 py-1 rounded-md font-mono">Stock: {product.stock}</span>
                      </div>
                      <p className="text-cyan-400 font-mono text-sm">{product.price} ETH</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white border-b border-slate-800 pb-4 mb-6">Customer Orders</h2>
                <div className="space-y-4">
                  {mySales.map(order => (
                    <div key={order.orderId} className="bg-slate-900/60 p-5 rounded-2xl border border-slate-700/50 flex justify-between items-center">
                      <div>
                        <h3 className="font-bold text-white">{order.name} <span className="text-slate-400 text-sm">x{order.quantity}</span> <span className="text-slate-600 font-normal ml-2">#{order.orderId}</span></h3>
                        <p className="text-xs font-mono text-slate-400 mt-1">Buyer: {order.buyer}</p>
                        <p className="text-xs font-mono text-cyan-500 mt-1">Value: {(order.quantity * parseFloat(order.price)).toLocaleString('fullwide', {maximumFractionDigits:4})} ETH</p>
                      </div>
                      <div>
                        {order.isDelivered ? (
                          <span className="text-emerald-400 text-sm font-bold border border-emerald-900 bg-emerald-900/20 px-3 py-1 rounded-full">Funds Released</span>
                        ) : (
                          <span className="text-amber-400 text-sm font-bold border border-amber-900 bg-amber-900/20 px-3 py-1 rounded-full">Awaiting Buyer</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-slate-900 rounded-3xl p-6 md:p-8 w-full max-w-md border border-slate-700/50 shadow-2xl relative">
              <button onClick={() => setShowAddModal(false)} className="absolute top-5 right-5 text-slate-400 hover:text-white">✕</button>
              <h2 className="text-2xl font-bold text-white mb-6">List New Product</h2>
              <form onSubmit={handleListProduct} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Product Name</label>
                  <input type="text" required value={newName} onChange={e => setNewName(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1.5">Price (ETH)</label>
                    <input type="number" step="0.0001" required value={newPrice} onChange={e => setNewPrice(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 font-mono outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1.5">Total Inventory</label>
                    <input type="number" min="1" required value={newStock} onChange={e => setNewStock(parseInt(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 font-mono outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Image URL</label>
                  <input type="text" required value={newImage} onChange={e => setNewImage(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 outline-none" />
                </div>
                <button type="submit" disabled={loading} className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-lg mt-4 disabled:opacity-50">
                  {loading ? 'Adding...' : 'List on Marketplace'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
