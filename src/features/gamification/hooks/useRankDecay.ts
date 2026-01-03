import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { logger } from '@/lib/logger';
import { getDailyTax } from '../utils';
import type { UserXP } from '@/lib/types';

const LAST_DECAY_KEY = 'last_decay_processed';

interface UseRankDecayReturn {
  taxApplied: number;
  processing: boolean;
  error: string | null;
}

/**
 * Hook to handle daily rank decay (inconsistency penalty)
 * Tracks last login and applies XP tax for missed days
 */
export function useRankDecay(): UseRankDecayReturn {
  const [taxApplied, setTaxApplied] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) return;

    const processDecay = async () => {
      try {
        setProcessing(true);
        setError(null);

        // Get today's date (YYYY-MM-DD format)
        const today = new Date().toISOString().split('T')[0];

        // Get last decay processed date from localStorage
        const lastDecayDate = localStorage.getItem(LAST_DECAY_KEY);

        // If this is the first time or we already processed today, skip
        if (!lastDecayDate || lastDecayDate === today) {
          setProcessing(false);
          return;
        }

        // Calculate days missed
        const lastDate = new Date(lastDecayDate);
        const currentDate = new Date(today);
        const daysMissed = Math.floor(
          (currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        // If no days missed, skip
        if (daysMissed <= 0) {
          localStorage.setItem(LAST_DECAY_KEY, today);
          setProcessing(false);
          return;
        }

        // Fetch user's current XP data
        const { data: xpData, error: fetchError } = await supabase
          .from('user_xp')
          .select('*')
          .eq('user_id', user.id);

        if (fetchError) throw fetchError;

        if (!xpData || xpData.length === 0) {
          // No XP to tax
          localStorage.setItem(LAST_DECAY_KEY, today);
          setProcessing(false);
          return;
        }

        // Type the xpData properly
        const typedXpData = xpData as UserXP[];

        // Calculate total XP
        const totalXP = typedXpData.reduce((sum, xp) => sum + xp.current_xp, 0);

        // Calculate daily tax based on total XP
        const dailyTax = getDailyTax(totalXP);
        const totalTax = dailyTax * daysMissed;

        // If no tax to apply, skip
        if (totalTax <= 0) {
          localStorage.setItem(LAST_DECAY_KEY, today);
          setProcessing(false);
          return;
        }

        // Apply tax: deduct proportionally from each attribute
        const taxApplications = await applyTaxToAttributes(
          user.id,
          typedXpData,
          totalTax,
          totalXP
        );

        const actualTaxApplied = taxApplications.reduce((sum, tax) => sum + tax, 0);
        setTaxApplied(actualTaxApplied);

        // Update last decay date
        localStorage.setItem(LAST_DECAY_KEY, today);

        logger.info(`Applied ${actualTaxApplied} XP tax for ${daysMissed} missed days`);
      } catch (err) {
        console.error('Error processing rank decay:', err);
        setError(err instanceof Error ? err.message : 'Failed to process rank decay');
      } finally {
        setProcessing(false);
      }
    };

    void processDecay();
  }, [user]);

  return {
    taxApplied,
    processing,
    error,
  };
}

/**
 * Apply tax to user attributes proportionally
 * Returns array of actual XP deducted from each attribute
 */
async function applyTaxToAttributes(
  userId: string,
  xpData: UserXP[],
  totalTax: number,
  totalXP: number
): Promise<number[]> {
  const taxApplications: number[] = [];

  // Calculate proportion of tax for each attribute
  for (const xp of xpData) {
    if (xp.current_xp <= 0) {
      taxApplications.push(0);
      continue;
    }

    // Calculate this attribute's share of the tax
    const proportion = xp.current_xp / totalXP;
    const attributeTax = Math.floor(totalTax * proportion);

    // Don't reduce below 0
    const actualTax = Math.min(attributeTax, xp.current_xp);

    if (actualTax > 0) {
      // Deduct XP from this attribute
      const newXP = Math.max(0, xp.current_xp - actualTax);

      const { error } = await supabase
        .from('user_xp')
        .update({ current_xp: newXP })
        .eq('user_id', userId)
        .eq('attribute_id', xp.attribute_id);

      if (error) {
        console.error(`Error applying tax to attribute ${xp.attribute_id}:`, error);
        taxApplications.push(0);
      } else {
        taxApplications.push(actualTax);
      }
    } else {
      taxApplications.push(0);
    }
  }

  return taxApplications;
}

/**
 * Initialize decay tracking for a new user
 * Call this on first login or signup
 */
export function initializeDecayTracking(): void {
  const today = new Date().toISOString().split('T')[0];
  localStorage.setItem(LAST_DECAY_KEY, today);
}

export default useRankDecay;
