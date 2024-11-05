// src/components/OptimizationFlow.tsx
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge';
import { Alert, AlertDescription } from '../components/ui/Alert';
import { Wand2, Lock, Zap, Shield } from 'lucide-react';
import { useAppState } from '../context/app.context';
import { aiService } from '../services/ai.service';

interface OptimizationCategory {
  id: 'PRIVACY' | 'FUNCTIONALITY' | 'SECURITY';
  icon: React.ReactNode;
  title: string;
  description: string;
  examples: string[];
}

const categories: OptimizationCategory[] = [
  {
    id: 'PRIVACY',
    icon: <Lock className="w-5 h-5" />,
    title: 'Privacy Enhancements',
    description: 'Improve data privacy and access control',
    examples: [
      'Add private state variables',
      'Implement selective access',
      'Add private events'
    ]
  },
  {
    id: 'FUNCTIONALITY',
    icon: <Zap className="w-5 h-5" />,
    title: 'Feature Updates',
    description: 'Enhance contract capabilities',
    examples: [
      'Add new features',
      'Modify existing functions',
      'Add emergency controls'
    ]
  },
  {
    id: 'SECURITY',
    icon: <Shield className="w-5 h-5" />,
    title: 'Security Improvements',
    description: 'Strengthen contract security',
    examples: [
      'Add access controls',
      'Improve validation',
      'Add safety checks'
    ]
  }
];

export const OptimizationFlow: React.FC = () => {
  const { state, dispatch } = useAppState();
  const [selectedCategory, setSelectedCategory] = useState<OptimizationCategory | null>(null);
  const [description, setDescription] = useState('');
  const [isOptimizing, setIsOptimizing] = useState(false);

  const handleOptimizationSubmit = async () => {
    if (!selectedCategory || !description.trim() || isOptimizing) return;

    setIsOptimizing(true);
    try {
      const result = await aiService.optimizeContract(state.contract!, description);

      dispatch({
        type: 'ADD_OPTIMIZATION',
        payload: {
          description,
          result: result.code
        }
      });

      dispatch({
        type: 'SET_CONTRACT',
        payload: result.code
      });

      if (state.optimizations.remaining === 1) {
        dispatch({ type: 'SET_STATE', payload: 'WALLET' });
      }

      setSelectedCategory(null);
      setDescription('');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: Date.now().toString(),
          type: 'error',
          content: `Optimization failed: ${errorMessage}`
        }
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  if (state.optimizations.remaining === 0) {
    return (
      <Alert>
        <AlertDescription>
          You've used all available optimization attempts.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Optimize Your Contract</h3>
        <Badge variant="secondary">
          {state.optimizations.remaining} attempts remaining
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {categories.map((category) => (
          <Card 
            key={category.id}
            className={`cursor-pointer transition-all ${
              selectedCategory?.id === category.id 
                ? 'ring-2 ring-blue-500' 
                : 'hover:shadow-lg'
            }`}
            onClick={() => setSelectedCategory(category)}
          >
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                {category.icon}
                <span>{category.title}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-2">
                {category.description}
              </p>
              <ul className="text-sm text-gray-500 list-disc list-inside">
                {category.examples.map((example, i) => (
                  <li key={i}>{example}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedCategory && (
        <div className="space-y-4">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={`Describe your ${selectedCategory.title.toLowerCase()} optimization request...`}
            className="w-full p-4 rounded-lg border focus:ring-2 focus:ring-blue-500 h-32 resize-none"
            maxLength={400}
            disabled={isOptimizing}
          />
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">
              {description.length}/400 characters
            </span>
            <Button
              onClick={handleOptimizationSubmit}
              disabled={!description.trim() || isOptimizing}
            >
              <Wand2 className="w-4 h-4 mr-2" />
              Optimize Contract
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};