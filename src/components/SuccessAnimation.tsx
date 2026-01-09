import React from 'react';

export const SuccessAnimation: React.FC<{
  message?: string;
  onComplete?: () => void;
  visible: boolean;
}> = ({ message = "Approved Successfully!", visible, onComplete }) => {
  React.useEffect(() => {
    if (visible && onComplete) {
      const timer = setTimeout(() => {
        onComplete();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [visible, onComplete]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-300">
      <div className="bg-white rounded-2xl p-8 flex flex-col items-center shadow-2xl transform scale-100 animate-in fade-in zoom-in duration-300">
        <div className="w-24 h-24 mb-4 relative">
          <svg
            className="w-full h-full text-green-500 animate-[checkmark_0.5s_ease-out_forwards]"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 52 52"
          >
            <circle
              className="stroke-current animate-[stroke_0.6s_cubic-bezier(0.65,0,0.45,1)_forwards]"
              cx="26"
              cy="26"
              r="25"
              fill="none"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="166"
              strokeDashoffset="166"
            />
            <path
              className="stroke-current animate-[stroke_0.3s_cubic-bezier(0.65,0,0.45,1)_0.3s_forwards]"
              fill="none"
              strokeWidth="2"
              d="M14.1 27.2l7.1 7.2 16.7-16.8"
              strokeLinecap="round"
              strokeDasharray="48"
              strokeDashoffset="48"
            />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-800 animate-[fadeUp_0.5s_ease-out_0.3s_forwards] opacity-0">
          {message}
        </h3>
        <style>{`
          @keyframes stroke {
            100% { stroke-dashoffset: 0; }
          }
          @keyframes checkmark {
            0% { transform: scale(0); }
            50% { transform: scale(1.2); }
            100% { transform: scale(1); }
          }
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    </div>
  );
};
