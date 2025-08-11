import { useState, useEffect, useCallback } from 'react';

/**
 * Settings Hook
 * Manages application-wide settings with localStorage persistence
 */
export function useSettings() {
  const [settings, setSettings] = useState({
    // Editor Preferences
    theme: 'vs-dark',
    fontSize: 14,
    fontFamily: 'Monaco, Menlo, monospace',
    wordWrap: 'on',
    autoComplete: true,
    bracketMatching: true,
    
    // Learning Preferences
    difficultyFilter: 'all',
    hintFrequency: 'normal',
    autoAdvance: true,
    progressTracking: true,
    
    // Notifications
    showCompletionToasts: true,
    playSuccessSounds: false,
  });

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('cql-clinic-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.warn('Failed to load saved settings:', error);
      }
    }
  }, []);

  // Listen for external settings changes
  useEffect(() => {
    const handleSettingsChange = (event) => {
      if (event.detail) {
        setSettings(prev => ({ ...prev, ...event.detail }));
      }
    };

    window.addEventListener('settingsChanged', handleSettingsChange);
    return () => {
      window.removeEventListener('settingsChanged', handleSettingsChange);
    };
  }, []);

  // Save settings to localStorage
  const saveSettings = useCallback((newSettings) => {
    try {
      const mergedSettings = { ...settings, ...newSettings };
      localStorage.setItem('cql-clinic-settings', JSON.stringify(mergedSettings));
      setSettings(mergedSettings);
      
      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('settingsChanged', { detail: mergedSettings }));
      
      return true;
    } catch (error) {
      console.error('Failed to save settings:', error);
      return false;
    }
  }, [settings]);

  // Update a single setting
  const updateSetting = useCallback((key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    
    // Auto-save to localStorage
    try {
      localStorage.setItem('cql-clinic-settings', JSON.stringify(newSettings));
      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('settingsChanged', { detail: newSettings }));
    } catch (error) {
      console.error('Failed to save setting:', error);
    }
  }, [settings]);

  // Reset to defaults
  const resetSettings = useCallback(() => {
    const defaultSettings = {
      theme: 'vs-dark',
      fontSize: 14,
      fontFamily: 'Monaco, Menlo, monospace',
      wordWrap: 'on',
      autoComplete: true,
      bracketMatching: true,
      difficultyFilter: 'all',
      hintFrequency: 'normal',
      autoAdvance: true,
      progressTracking: true,
      showCompletionToasts: true,
      playSuccessSounds: false,
    };
    
    setSettings(defaultSettings);
    localStorage.removeItem('cql-clinic-settings');
    
    // Dispatch event to notify other components
    window.dispatchEvent(new CustomEvent('settingsChanged', { detail: defaultSettings }));
    
    return true;
  }, []);

  return {
    settings,
    saveSettings,
    updateSetting,
    resetSettings,
  };
}