import React from 'react';
import './styles.css';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  steps: string[];
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ currentStep, totalSteps, steps }) => {
  return (
    <div className="progress-container">
      <div className="progress-steps">
        {steps.map((step, index) => (
          <div key={index} className="progress-step">
            <div className={`step-circle ${
              index < currentStep 
                ? 'completed' 
                : index === currentStep 
                ? 'current' 
                : 'pending'
            }`}>
              {index < currentStep ? '✓' : index + 1}
            </div>
            <span className={`step-label ${
              index <= currentStep ? 'active' : 'inactive'
            }`}>
              {step}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};