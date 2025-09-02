import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, X } from 'lucide-react';

interface RateLimitNotificationProps {
  show: boolean;
  message: string;
  retryAfter?: number; // em segundos
  onClose: () => void;
}

const RateLimitNotification: React.FC<RateLimitNotificationProps> = ({
  show,
  message,
  retryAfter = 900, // 15 minutos padrão
  onClose
}) => {
  const [timeLeft, setTimeLeft] = useState(retryAfter);

  useEffect(() => {
    if (!show || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [show, timeLeft, onClose]);

  useEffect(() => {
    if (show) {
      setTimeLeft(retryAfter);
    }
  }, [show, retryAfter]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  if (!show) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg shadow-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-yellow-400" />
          </div>
          
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Limite de Tentativas Excedido
            </h3>
            
            <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
              <p>{message}</p>
              
              {timeLeft > 0 && (
                <div className="mt-3 flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span className="font-mono text-sm">
                    Tempo restante: {formatTime(timeLeft)}
                  </span>
                </div>
              )}
            </div>
            
            <div className="mt-4">
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded hover:bg-yellow-200 dark:hover:bg-yellow-700 transition-colors"
                >
                  Fechar
                </button>
                
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="text-xs bg-yellow-200 dark:bg-yellow-700 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded hover:bg-yellow-300 dark:hover:bg-yellow-600 transition-colors"
                >
                  Recarregar Página
                </button>
              </div>
            </div>
          </div>
          
          <div className="ml-4 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex text-yellow-400 hover:text-yellow-600 dark:hover:text-yellow-300 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        {/* Barra de progresso */}
        {timeLeft > 0 && (
          <div className="mt-3">
            <div className="w-full bg-yellow-200 dark:bg-yellow-800 rounded-full h-1">
              <div 
                className="bg-yellow-400 dark:bg-yellow-600 h-1 rounded-full transition-all duration-1000 ease-linear"
                style={{ 
                  width: `${((retryAfter - timeLeft) / retryAfter) * 100}%` 
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RateLimitNotification;