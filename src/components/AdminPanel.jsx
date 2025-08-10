import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './AdminPanel.css';

const AdminPanel = ({ 
  onUpdateWithdrawalAmount, 
  onUpdatePowDifficulty, 
  onUpdateCooldownPeriod, 
  onUpdateBaseAmountMultiplier, 
  onUpdateBaseDifficultyMultiplier, 
  onDirectWithdrawal, 
  onDebugBlockInfo, 
  onWithdrawAllFunds, 
  loading,
  contract,
  isDevFaucet,
  powComplete 
}) => {
  const [withdrawalIndex, setWithdrawalIndex] = useState(1);
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [difficultyIndex, setDifficultyIndex] = useState(1);
  const [difficultyValue, setDifficultyValue] = useState('');
  const [cooldownPeriod, setCooldownPeriod] = useState('');
  const [baseAmountMultiplier, setBaseAmountMultiplier] = useState('');
  const [baseDifficultyMultiplier, setBaseDifficultyMultiplier] = useState('');
  const [currentAmounts, setCurrentAmounts] = useState(Array(8).fill(''));
  const [currentDifficulties, setCurrentDifficulties] = useState(Array(8).fill(''));
  const [baseAmounts, setBaseAmounts] = useState(Array(8).fill(''));
  const [currentAmountMultiplier, setCurrentAmountMultiplier] = useState('');

  // Fetch current on-chain amounts and difficulties for indices 1-8
  const refreshAdminIndexInfo = async () => {
    if (!contract || !isDevFaucet) return;
    try {
      const amountPromises = [];
      const baseAmountPromises = [];
      const difficultyPromises = [];
      for (let i = 1; i <= 8; i++) {
        amountPromises.push(contract.get_withdrawal_amount(i));
        baseAmountPromises.push(contract.withdrawal_amounts(i - 1));
        difficultyPromises.push(contract.get_difficulty_target(i));
      }
      const [amountsWei, baseAmountsWei, difficulties, amountMultiplier] = await Promise.all([
        Promise.all(amountPromises),
        Promise.all(baseAmountPromises),
        Promise.all(difficultyPromises),
        contract.base_amount_multiplier()
      ]);
      const formattedAmounts = amountsWei.map(v => {
        try { return ethers.formatEther(v); } catch { return ''; }
      });
      const formattedBaseAmounts = baseAmountsWei.map(v => {
        try { return ethers.formatEther(v); } catch { return ''; }
      });
      const formattedDifficulties = difficulties.map(v => v?.toString?.() ?? '');
      setCurrentAmounts(formattedAmounts);
      setBaseAmounts(formattedBaseAmounts);
      setCurrentDifficulties(formattedDifficulties);
      setCurrentAmountMultiplier(amountMultiplier?.toString?.() ?? '');
    } catch (e) {
      console.warn('Failed to fetch admin index info:', e);
    }
  };

  useEffect(() => {
    refreshAdminIndexInfo();
    // Re-fetch when loading flips to false after an update
  }, [loading]);

  const handleWithdrawalAmountSubmit = (e) => {
    e.preventDefault();
    if (withdrawalAmount && withdrawalIndex >= 1 && withdrawalIndex <= 8) {
      onUpdateWithdrawalAmount(withdrawalIndex, withdrawalAmount);
      setWithdrawalAmount('');
    }
  };

  const handleDifficultySubmit = (e) => {
    e.preventDefault();
    if (difficultyValue && difficultyIndex >= 1 && difficultyIndex <= 8) {
      onUpdatePowDifficulty(difficultyIndex, parseInt(difficultyValue));
      setDifficultyValue('');
    }
  };

  const handleCooldownSubmit = (e) => {
    e.preventDefault();
    if (cooldownPeriod !== '') {
      onUpdateCooldownPeriod(parseInt(cooldownPeriod));
      setCooldownPeriod('');
    }
  };

  const handleBaseAmountMultiplierSubmit = (e) => {
    e.preventDefault();
    if (baseAmountMultiplier !== '') {
      // Convert decimal to integer (1.5 -> 1500)
      const multiplierInt = Math.round(parseFloat(baseAmountMultiplier) * 1000);
      onUpdateBaseAmountMultiplier(multiplierInt);
      setBaseAmountMultiplier('');
    }
  };

  const handleBaseDifficultyMultiplierSubmit = (e) => {
    e.preventDefault();
    if (baseDifficultyMultiplier !== '') {
      // Convert decimal to integer (1.5 -> 1500)
      const multiplierInt = Math.round(parseFloat(baseDifficultyMultiplier) * 1000);
      onUpdateBaseDifficultyMultiplier(multiplierInt);
      setBaseDifficultyMultiplier('');
    }
  };

  return (
    <div className="admin-panel-content">
      <div className="admin-section">
        <h4>💰 Update Withdrawal Amount</h4>
        <form onSubmit={handleWithdrawalAmountSubmit} className="admin-form">
          <div className="form-row">
            <select 
              value={withdrawalIndex} 
              onChange={(e) => setWithdrawalIndex(parseInt(e.target.value))}
              className="admin-select"
            >
              {[1,2,3,4,5,6,7,8].map(i => {
                const effective = currentAmounts[i-1];
                const base = baseAmounts[i-1];
                const multiplierText = currentAmountMultiplier ? `${(Number(currentAmountMultiplier)/1000).toFixed(2)}x` : '';
                const parts = [];
                if (effective) parts.push(`current ${Number(effective).toLocaleString(undefined, { maximumFractionDigits: 6 })}`);
                if (base) parts.push(`base ${Number(base).toLocaleString(undefined, { maximumFractionDigits: 6 })}`);
                if (multiplierText) parts.push(multiplierText);
                const info = parts.length ? `(${parts.join(', ')})` : '';
                return (
                  <option key={i} value={i}>
                    {`Index ${i} ${info}`}
                  </option>
                );
              })}
            </select>
            <input
              type="number"
              value={withdrawalAmount}
              onChange={(e) => setWithdrawalAmount(e.target.value)}
              placeholder="New amount (tokens)"
              className="admin-input"
              min="0"
              step="0.1"
            />
            <button type="submit" disabled={loading || !withdrawalAmount} className="admin-button">
              Update Amount
            </button>
          </div>
        </form>
      </div>

      <div className="admin-section">
        <h4>⛏️ Update PoW Difficulty</h4>
        <form onSubmit={handleDifficultySubmit} className="admin-form">
          <div className="form-row">
            <select 
              value={difficultyIndex} 
              onChange={(e) => setDifficultyIndex(parseInt(e.target.value))}
              className="admin-select"
            >
              {[1,2,3,4,5,6,7,8].map(i => (
                <option key={i} value={i}>
                  Index {i} {currentDifficulties[i-1] ? `(currently ${currentDifficulties[i-1]})` : ''}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={difficultyValue}
              onChange={(e) => setDifficultyValue(e.target.value)}
              placeholder="New difficulty"
              className="admin-input"
              min="1000"
              step="1000"
            />
            <button type="submit" disabled={loading || !difficultyValue} className="admin-button">
              Update Difficulty
            </button>
          </div>
        </form>
      </div>

      <div className="admin-section">
        <h4>⏰ Update Cooldown Period</h4>
        <form onSubmit={handleCooldownSubmit} className="admin-form">
          <div className="form-row">
            <input
              type="number"
              value={cooldownPeriod}
              onChange={(e) => setCooldownPeriod(e.target.value)}
              placeholder="Cooldown period (seconds, 0 = no cooldown)"
              className="admin-input"
              min="0"
              step="1"
            />
            <button type="submit" disabled={loading || cooldownPeriod === ''} className="admin-button">
              Update Cooldown
            </button>
          </div>
        </form>
      </div>

      <div className="admin-section multiplier-section">
        <h4>🎯 Global Multipliers</h4>
        
        <div className="multiplier-subsection">
          <h5>💰 Base Amount Multiplier</h5>
          <p className="multiplier-info">Multiplies all withdrawal amounts (1.0 = default, 2.0 = double amounts)</p>
          <form onSubmit={handleBaseAmountMultiplierSubmit} className="admin-form">
            <div className="form-row">
              <input
                type="number"
                value={baseAmountMultiplier}
                onChange={(e) => setBaseAmountMultiplier(e.target.value)}
                placeholder="Amount multiplier (e.g., 1.5 for 1.5x)"
                className="admin-input"
                min="0.1"
                step="0.1"
              />
              <button type="submit" disabled={loading || !baseAmountMultiplier} className="admin-button">
                Update Amount Multiplier
              </button>
            </div>
          </form>
        </div>

        <div className="multiplier-subsection"> 
          <h5>⛏️ Base Difficulty Multiplier</h5>
          <p className="multiplier-info">Multiplies all PoW difficulties (1.0 = default, 2.0 = double difficulty)</p>
          <form onSubmit={handleBaseDifficultyMultiplierSubmit} className="admin-form">
            <div className="form-row">
              <input
                type="number"
                value={baseDifficultyMultiplier}
                onChange={(e) => setBaseDifficultyMultiplier(e.target.value)}
                placeholder="Difficulty multiplier (e.g., 0.5 for 0.5x)"
                className="admin-input"
                min="0.1"
                step="0.1"
              />
              <button type="submit" disabled={loading || !baseDifficultyMultiplier} className="admin-button">
                Update Difficulty Multiplier
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="admin-section">
        <h4>🧪 Direct Withdrawal Test</h4>
        <p className="multiplier-info">Test direct contract interaction bypassing the server (requires completed PoW)</p>
        <button 
          onClick={onDirectWithdrawal}
          disabled={loading || !powComplete}
          className="admin-button direct-withdrawal-button"
        >
          {!powComplete ? 'Complete Mining First' : '🚀 Test Direct Withdrawal'}
        </button>
      </div>

      <div className="admin-section">
        <h4>🔍 Debug Block Info</h4>
        <p className="multiplier-info">Debug blockchain block numbers and contract state</p>
        <button 
          onClick={onDebugBlockInfo}
          disabled={loading}
          className="admin-button"
        >
          🔍 Debug Block Info (Check Console)
        </button>
      </div>

      <div className="admin-section">
        <h4>💸 Withdraw All Funds</h4>
        <p className="multiplier-info">Emergency withdrawal - extract all funds from the faucet contract</p>
        <button 
          onClick={onWithdrawAllFunds}
          disabled={loading}
          className="admin-button withdraw-all-button"
        >
          💸 Withdraw All Funds
        </button>
      </div>
    </div>
  );
};

export default AdminPanel;
