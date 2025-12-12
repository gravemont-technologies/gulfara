import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { ArrowRight, ArrowLeft, User, Target, BookOpen, Heart } from 'lucide-react';
import { useSupabaseClient } from '@/supabase/client';
import { useProfile } from '@/contexts/ProfileContext';
import { useToast } from '@/hooks/use-toast';
import type { ProfileRecord } from '@/hooks/useEnsureProfile';
import { ensureDeckForProfile } from '@/services/deckManager';

interface OnboardingData {
  name: string;
  gender: 'male' | 'female';
  ageRange: '18-25' | '26-35' | '36-45' | '46-55' | '55+';
  occupation: string;
  learningGoal: string[];
  difficultyLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
  categories: string[];
}

const onboardingSteps = [
  { id: 'personal', title: 'Personal Info', icon: User },
  { id: 'goals', title: 'Learning Goals', icon: Target },
  { id: 'level', title: 'Difficulty Level', icon: BookOpen },
  { id: 'categories', title: 'Interests', icon: Heart }
];

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();
  const supabase = useSupabaseClient();
  const { profile, setProfile } = useProfile();
  const { toast } = useToast();

  const defaultData: OnboardingData = useMemo(() => {
    const onboardingData = (profile.onboarding_data ?? {}) as Partial<OnboardingData>;
    const categoriesFromProfile = profile.preferred_categories ?? [];
    const goalsFromProfile = profile.learning_goals ?? [];

    const resolvedGender =
      onboardingData.gender ??
      (profile.gender === 'female' ? 'female' : 'male');

    const resolvedAge =
      onboardingData.ageRange ??
      (['18-25', '26-35', '36-45', '46-55', '55+'].includes(profile.age_range ?? '')
        ? (profile.age_range as OnboardingData['ageRange'])
        : '18-25');

    const resolvedDifficulty =
      onboardingData.difficultyLevel ??
      (['A1', 'A2', 'B1', 'B2', 'C1'].includes(profile.difficulty_level ?? '')
        ? (profile.difficulty_level as OnboardingData['difficultyLevel'])
        : 'A1');

    return {
      name: onboardingData.name ?? profile.name ?? '',
      gender: resolvedGender as OnboardingData['gender'],
      ageRange: resolvedAge as OnboardingData['ageRange'],
      occupation: onboardingData.occupation ?? profile.occupation ?? '',
      learningGoal: onboardingData.learningGoal ?? goalsFromProfile,
      difficultyLevel: resolvedDifficulty,
      categories: onboardingData.categories ?? categoriesFromProfile,
    };
  }, [profile]);

  const [data, setData] = useState<OnboardingData>(defaultData);

  useEffect(() => {
    setData(defaultData);
  }, [defaultData]);

  const updateData = (field: keyof OnboardingData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      void handleComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      const payload = {
        name: data.name,
        gender: data.gender,
        age_range: data.ageRange,
        occupation: data.occupation,
        learning_goals: data.learningGoal,
        difficulty_level: data.difficultyLevel,
        preferred_categories: data.categories,
        onboarding_completed: true,
        onboarding_data: data,
        preferences: {
          categories: data.categories,
          difficultyLevel: data.difficultyLevel,
          learningGoal: data.learningGoal,
        },
      };

      const { data: updatedProfile, error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', profile.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      const nextProfile: ProfileRecord = {
        ...profile,
        ...updatedProfile,
        onboarding_completed: true,
        onboarding_data: data,
        preferences: {
          categories: data.categories,
          difficultyLevel: data.difficultyLevel,
          learningGoal: data.learningGoal,
        },
        learning_goals: updatedProfile?.learning_goals ?? data.learningGoal,
        preferred_categories: updatedProfile?.preferred_categories ?? data.categories,
      } as ProfileRecord;

      setProfile(nextProfile);

      try {
        await ensureDeckForProfile(supabase, nextProfile, {
          categories: nextProfile.preferences?.categories as string[] ?? nextProfile.preferred_categories ?? [],
          difficultyLevel: nextProfile.preferences?.difficultyLevel as string ?? nextProfile.difficulty_level ?? data.difficultyLevel,
          learningGoals: nextProfile.preferences?.learningGoal as string[] ?? nextProfile.learning_goals ?? data.learningGoal,
          force: true,
        });
      } catch (prefetchError) {
        console.warn('Deck prefetch failed after onboarding:', prefetchError);
      }

      toast({
        title: 'Profile updated',
        description: 'Your learning experience is now tailored to you.',
      });

      navigate('/app');
    } catch (error) {
      console.error('Failed to complete onboarding', error);
      toast({
        title: 'Unable to save onboarding',
        description: 'Please try again in a moment.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div>
              <Label htmlFor="name">What's your name?</Label>
              <Input
                id="name"
                value={data.name}
                onChange={(e) => updateData('name', e.target.value)}
                placeholder="Enter your name"
                className="mt-2"
              />
            </div>
            <div>
              <Label>Gender</Label>
              <RadioGroup
                value={data.gender}
                onValueChange={(value) => updateData('gender', value as OnboardingData['gender'])}
                className="mt-2 space-y-2"
              >
                {[
                  { value: 'male', label: 'Male' },
                  { value: 'female', label: 'Female' }
                ].map((option) => (
                  <Label
                    key={option.value}
                    htmlFor={option.value}
                    className="flex items-center space-x-2 cursor-pointer bg-white/80 rounded-md border border-gray-200 px-3 py-2 hover:border-blue-400 transition"
                  >
                    <RadioGroupItem id={option.value} value={option.value} className="h-4 w-4" />
                    <span>{option.label}</span>
                  </Label>
                ))}
              </RadioGroup>
            </div>
            <div>
              <Label>Age Range</Label>
              <RadioGroup
                value={data.ageRange}
                onValueChange={(value) => updateData('ageRange', value as OnboardingData['ageRange'])}
                className="mt-2 space-y-2"
              >
                {['18-25', '26-35', '36-45', '46-55', '55+'].map((age) => (
                  <Label
                    key={age}
                    htmlFor={age}
                    className="flex items-center space-x-2 cursor-pointer bg-white/80 rounded-md border border-gray-200 px-3 py-2 hover:border-blue-400 transition"
                  >
                    <RadioGroupItem value={age} id={age} className="h-4 w-4" />
                    <span>{age}</span>
                  </Label>
                ))}
              </RadioGroup>
            </div>
            <div>
              <Label htmlFor="occupation">Occupation</Label>
              <Input
                id="occupation"
                value={data.occupation}
                onChange={(e) => updateData('occupation', e.target.value)}
                placeholder="What do you do?"
                className="mt-2"
              />
            </div>
          </motion.div>
        );

      case 1:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div>
              <Label>Why are you learning Gulf Arabic?</Label>
              <div className="mt-4 space-y-3">
                {[
                  { id: 'work', label: 'Work & Business' },
                  { id: 'family', label: 'Family & Relationships' },
                  { id: 'religion', label: 'Religious Studies' },
                  { id: 'culture', label: 'Cultural Understanding' },
                  { id: 'travel', label: 'Travel & Tourism' },
                  { id: 'education', label: 'Academic Studies' }
                ].map((goal) => (
                  <div key={goal.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={goal.id}
                      checked={data.learningGoal.includes(goal.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          updateData('learningGoal', [...data.learningGoal, goal.id]);
                        } else {
                          updateData('learningGoal', data.learningGoal.filter(g => g !== goal.id));
                        }
                      }}
                    />
                    <Label htmlFor={goal.id}>{goal.label}</Label>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div>
              <Label>What's your current Arabic level?</Label>
              <RadioGroup
                value={data.difficultyLevel}
                onValueChange={(value) => updateData('difficultyLevel', value as OnboardingData['difficultyLevel'])}
                className="mt-4 space-y-4"
              >
                {[
                  { level: 'A1', title: 'Beginner', desc: 'I know basic greetings and simple words' },
                  { level: 'A2', title: 'Elementary', desc: 'I can have simple conversations' },
                  { level: 'B1', title: 'Intermediate', desc: 'I can discuss familiar topics' },
                  { level: 'B2', title: 'Upper Intermediate', desc: 'I can express ideas clearly' },
                  { level: 'C1', title: 'Advanced', desc: 'I can use Arabic fluently and spontaneously' }
                ].map((level) => {
                  const isSelected = data.difficultyLevel === level.level;
                  return (
                    <Label key={level.level} className="block">
                      <RadioGroupItem value={level.level} className="sr-only" />
                      <Card
                        className={`cursor-pointer transition-all ${
                          isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-3">
                            <div className={`w-3 h-3 rounded-full border ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`} />
                            <div>
                              <h3 className="font-semibold">{level.level} - {level.title}</h3>
                              <p className="text-sm text-gray-600">{level.desc}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Label>
                  );
                })}
              </RadioGroup>
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div>
              <Label>Which topics interest you most?</Label>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {[
                  { id: 'family', label: 'Family & Relationships' },
                  { id: 'work', label: 'Work & Business' },
                  { id: 'travel', label: 'Travel & Tourism' },
                  { id: 'food', label: 'Food & Dining' },
                  { id: 'shopping', label: 'Shopping & Markets' },
                  { id: 'health', label: 'Health & Medical' },
                  { id: 'education', label: 'Education & Learning' },
                  { id: 'social', label: 'Social & Cultural' }
                ].map((category) => (
                  <Card
                    key={category.id}
                    className={`cursor-pointer transition-all ${
                      data.categories.includes(category.id)
                        ? 'ring-2 ring-blue-500 bg-blue-50'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      if (data.categories.includes(category.id)) {
                        updateData('categories', data.categories.filter(c => c !== category.id));
                      } else {
                        updateData('categories', [...data.categories, category.id]);
                      }
                    }}
                  >
                    <CardContent className="p-4 text-center">
                      <Checkbox
                        checked={data.categories.includes(category.id)}
                        onCheckedChange={() => {}}
                        className="mb-2"
                      />
                      <p className="text-sm font-medium">{category.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return data.name.trim() !== '';
      case 1:
        return data.learningGoal.length > 0;
      case 2:
        return data.difficultyLevel !== '';
      case 3:
        return data.categories.length > 0;
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            Welcome to Gulfara
          </CardTitle>
          <p className="text-gray-600 mt-2">
            Let's personalize your Arabic learning journey
          </p>
          <Progress value={(currentStep + 1) / onboardingSteps.length * 100} className="mt-4" />
        </CardHeader>
        <CardContent className="p-8">
          <div className="mb-8">
            <div className="flex items-center justify-center space-x-2 mb-4">
              {onboardingSteps.map((step, index) => (
                <div
                  key={step.id}
                  className={`flex items-center space-x-2 ${
                    index <= currentStep ? 'text-blue-600' : 'text-gray-400'
                  }`}
                >
                  <step.icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{step.title}</span>
                  {index < onboardingSteps.length - 1 && (
                    <div className={`w-8 h-0.5 ${
                      index < currentStep ? 'bg-blue-600' : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {renderStep()}

          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous</span>
            </Button>
            <Button
              onClick={nextStep}
              disabled={!canProceed() || isSaving}
              className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:opacity-70"
            >
              <span>
                {currentStep === onboardingSteps.length - 1
                  ? (isSaving ? 'Saving...' : 'Complete')
                  : 'Next'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
