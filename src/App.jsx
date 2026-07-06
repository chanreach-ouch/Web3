import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

const CONTRACT_ABI = [
  {
    "inputs": [
      {
        "internalType": "address payable",
        "name": "_seller",
        "type": "address"
      }
    ],
    "stateMutability": "payable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "buyer",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "confirmDelivery",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBalance",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "isCompleted",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "seller",
    "outputs": [
      {
        "internalType": "address payable",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

export default function App() {
  const [account, setAccount] = useState('');
  const [network, setNetwork] = useState(null);
  const [contractAddress, setContractAddress] = useState('');
  const [contract, setContract] = useState(null);
  
  const [buyer, setBuyer] = useState('');
  const [seller, setSeller] = useState('');
  const [balance, setBalance] = useState('0');
  const [isCompleted, setIsCompleted] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        setError('');
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        setAccount(accounts[0]);
        
        const networkInfo = await provider.getNetwork();
        setNetwork(networkInfo.name);

        window.ethereum.on('accountsChanged', (accounts) => {
          if (accounts.length > 0) {
            setAccount(accounts[0]);
          } else {
            setAccount('');
          }
        });
        
        window.ethereum.on('chainChanged', () => {
          window.location.reload();
        });
      } catch (err) {
        setError(err.message || 'Failed to connect wallet');
      }
    } else {
      setError('MetaMask is not installed! Please install it to use this app.');
    }
  };

  const loadContract = async (e) => {
    e.preventDefault();
    if (!contractAddress || !ethers.isAddress(contractAddress)) {
      setError("Please enter a valid contract address.");
      return;
    }
    
    if (!account) {
      setError("Please connect your wallet first.");
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const simplePurchase = new ethers.Contract(contractAddress, CONTRACT_ABI, signer);
      
      setContract(simplePurchase);
      
      await fetchContractData(simplePurchase);
      
      setSuccess("Contract loaded successfully!");
    } catch (err) {
      console.error(err);
      setError("Failed to load contract. Make sure it's deployed on the current network.");
      setContract(null);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchContractData = async (contractInstance) => {
    try {
      const b = await contractInstance.buyer();
      const s = await contractInstance.seller();
      const bal = await contractInstance.getBalance();
      const comp = await contractInstance.isCompleted();
      
      setBuyer(b);
      setSeller(s);
      setBalance(ethers.formatEther(bal));
      setIsCompleted(comp);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to fetch contract data.");
    }
  };

  const confirmDelivery = async () => {
    if (!contract) return;
    
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      if (account.toLowerCase() !== buyer.toLowerCase()) {
        throw new Error("Only the buyer can confirm delivery.");
      }
      
      if (isCompleted) {
        throw new Error("This transaction is already completed.");
      }
      
      const tx = await contract.confirmDelivery();
      setSuccess("Transaction submitted! Waiting for confirmation...");
      
      await tx.wait();
      
      setSuccess("Delivery confirmed successfully!");
      await fetchContractData(contract); // refresh data
      
    } catch (err) {
      console.error(err);
      if (err.reason) {
        setError(`Transaction failed: ${err.reason}`);
      } else {
        setError(err.message || 'Transaction failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans p-6 selection:bg-cyan-500/30">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <header className="flex flex-col md:flex-row justify-between items-center bg-slate-800/80 backdrop-blur-md p-6 rounded-2xl shadow-xl border border-slate-700/50">
          <div className="mb-4 md:mb-0">
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              SimplePurchase
            </h1>
            <p className="text-slate-400 mt-1">Decentralized Delivery Confirmation</p>
          </div>
          
          <div className="flex flex-col items-end">
            {!account ? (
              <button 
                onClick={connectWallet}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold rounded-lg shadow-lg hover:shadow-cyan-500/25 transition-all duration-300 transform hover:-translate-y-0.5"
              >
                Connect MetaMask
              </button>
            ) : (
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-2 bg-slate-700/50 px-4 py-2 rounded-full border border-slate-600/50">
                  <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)] animate-pulse"></div>
                  <span className="text-sm font-mono text-green-400">
                    {network || 'Unknown Network'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-2 font-mono bg-slate-900/80 px-3 py-1 rounded-md border border-slate-800">
                  {account.substring(0, 6)}...{account.substring(account.length - 4)}
                </p>
              </div>
            )}
          </div>
        </header>

        {error && (
          <div className="p-4 bg-red-900/40 border-l-4 border-red-500 rounded-r-lg text-red-200 flex items-center shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 flex-shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>{error}</p>
          </div>
        )}
        
        {success && (
          <div className="p-4 bg-emerald-900/40 border-l-4 border-emerald-500 rounded-r-lg text-emerald-200 flex items-center shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 flex-shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>{success}</p>
          </div>
        )}

        <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl p-6 md:p-8 shadow-xl border border-slate-700/50 transition-all hover:border-slate-600/50">
          <h2 className="text-xl font-bold mb-4 text-white">Load Contract</h2>
          <form onSubmit={loadContract} className="flex flex-col sm:flex-row gap-4">
            <input 
              type="text" 
              placeholder="Enter contract address (0x...)" 
              value={contractAddress}
              onChange={(e) => setContractAddress(e.target.value)}
              className="flex-1 bg-slate-900/80 border border-slate-600 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 font-mono transition-all placeholder:text-slate-600"
              required
            />
            <button 
              type="submit"
              disabled={loading || !account}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-slate-900/50 whitespace-nowrap active:scale-95"
            >
              {loading ? 'Loading...' : 'Load Contract'}
            </button>
          </form>
        </div>

        {contract && (
          <div className="grid md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl p-6 border border-slate-700/50 shadow-xl hover:border-slate-600/50 transition-colors">
              <h2 className="text-xl font-bold mb-6 text-white border-b border-slate-700/50 pb-3 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Contract Data
              </h2>
              
              <div className="space-y-5">
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Status</label>
                  <div className="mt-2 flex items-center">
                    <span className={`px-4 py-1.5 rounded-full text-xs font-bold shadow-sm transition-all ${
                      isCompleted 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {isCompleted ? 'Completed' : 'Pending Delivery'}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/30">
                  <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Balance (ETH)</label>
                  <p className="text-3xl font-mono text-cyan-400 mt-1">{balance}</p>
                </div>

                <div className="pt-2">
                  <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Buyer Address</label>
                  <div className="mt-1 flex items-center bg-slate-900/80 p-3 rounded-lg border border-slate-700/50">
                    <p className="text-sm font-mono break-all text-slate-300">
                      {buyer || 'N/A'}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Seller Address</label>
                  <div className="mt-1 flex items-center bg-slate-900/80 p-3 rounded-lg border border-slate-700/50">
                    <p className="text-sm font-mono break-all text-slate-300">
                      {seller || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl p-6 border border-slate-700/50 shadow-xl hover:border-slate-600/50 transition-colors flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl"></div>
              
              <div className="relative z-10">
                <h2 className="text-xl font-bold mb-4 text-white border-b border-slate-700/50 pb-3 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Actions
                </h2>
                <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                  Only the <span className="text-slate-300 font-medium">buyer</span> can confirm delivery. Once confirmed, the smart contract will automatically transfer the locked balance to the seller.
                </p>
              </div>
              
              <div className="mt-auto relative z-10">
                <button 
                  onClick={confirmDelivery}
                  disabled={isCompleted || loading || (account?.toLowerCase() !== buyer?.toLowerCase())}
                  className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all duration-300 flex items-center justify-center
                    ${
                      isCompleted 
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700 shadow-none' 
                      : account?.toLowerCase() !== buyer?.toLowerCase()
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700 shadow-none'
                        : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white hover:shadow-purple-500/25 transform hover:-translate-y-1 active:scale-[0.98]'
                    }
                  `}
                >
                  {loading ? (
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : null}
                  {isCompleted ? 'Delivery Confirmed' : 'Confirm Delivery'}
                </button>
                
                {account?.toLowerCase() !== buyer?.toLowerCase() && !isCompleted && buyer && (
                  <p className="text-center text-sm text-amber-500 mt-4 flex items-center justify-center bg-amber-500/10 py-2 rounded-lg border border-amber-500/20">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    You are not the connected buyer
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
