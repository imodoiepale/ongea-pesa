-- Migration: Add RLS policies for chama_members and related tables
-- Fixed to avoid infinite recursion with chamas table
-- Date: 2024-12-14

-- =====================================================
-- FIRST: Drop existing problematic policies on chamas
-- =====================================================

DROP POLICY IF EXISTS "Users can view chamas they are members of" ON public.chamas;

-- Recreate chamas SELECT policy WITHOUT referencing chama_members
CREATE POLICY "Users can view own chamas" ON public.chamas
  FOR SELECT USING (auth.uid() = creator_id);

-- =====================================================
-- CHAMA MEMBERS RLS POLICIES (non-recursive)
-- =====================================================

-- Allow anyone authenticated to insert members (creator check done in API)
CREATE POLICY "Authenticated users can insert chama members" ON public.chama_members
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to view members - either they created the chama OR they are a member
CREATE POLICY "Users can view chama members" ON public.chama_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR 
    chama_id IN (SELECT id FROM public.chamas WHERE creator_id = auth.uid())
  );

-- Allow chama creators to update members
CREATE POLICY "Chama creators can update members" ON public.chama_members
  FOR UPDATE USING (
    chama_id IN (SELECT id FROM public.chamas WHERE creator_id = auth.uid())
  );

-- Allow chama creators to delete members
CREATE POLICY "Chama creators can delete members" ON public.chama_members
  FOR DELETE USING (
    chama_id IN (SELECT id FROM public.chamas WHERE creator_id = auth.uid())
  );

-- =====================================================
-- CHAMA CYCLES RLS POLICIES (non-recursive)
-- =====================================================

CREATE POLICY "Chama creators can insert cycles" ON public.chama_cycles
  FOR INSERT WITH CHECK (
    chama_id IN (SELECT id FROM public.chamas WHERE creator_id = auth.uid())
  );

CREATE POLICY "Users can view cycles of their chamas" ON public.chama_cycles
  FOR SELECT USING (
    chama_id IN (SELECT id FROM public.chamas WHERE creator_id = auth.uid())
  );

CREATE POLICY "Chama creators can update cycles" ON public.chama_cycles
  FOR UPDATE USING (
    chama_id IN (SELECT id FROM public.chamas WHERE creator_id = auth.uid())
  );

-- =====================================================
-- CHAMA STK REQUESTS RLS POLICIES (non-recursive)
-- =====================================================

CREATE POLICY "Chama creators can insert STK requests" ON public.chama_stk_requests
  FOR INSERT WITH CHECK (
    chama_id IN (SELECT id FROM public.chamas WHERE creator_id = auth.uid())
  );

CREATE POLICY "Users can view STK requests of their chamas" ON public.chama_stk_requests
  FOR SELECT USING (
    chama_id IN (SELECT id FROM public.chamas WHERE creator_id = auth.uid())
  );

CREATE POLICY "System can update STK requests" ON public.chama_stk_requests
  FOR UPDATE USING (true);

-- =====================================================
-- CHAMA PAYOUTS RLS POLICIES (non-recursive)
-- =====================================================

CREATE POLICY "Chama creators can insert payouts" ON public.chama_payouts
  FOR INSERT WITH CHECK (
    chama_id IN (SELECT id FROM public.chamas WHERE creator_id = auth.uid())
  );

CREATE POLICY "Users can view payouts of their chamas" ON public.chama_payouts
  FOR SELECT USING (
    chama_id IN (SELECT id FROM public.chamas WHERE creator_id = auth.uid())
  );

CREATE POLICY "Chama creators can update payouts" ON public.chama_payouts
  FOR UPDATE USING (
    chama_id IN (SELECT id FROM public.chamas WHERE creator_id = auth.uid())
  );

-- =====================================================
-- CHAMA PROJECTS RLS POLICIES (non-recursive)
-- =====================================================

CREATE POLICY "Chama creators can manage projects" ON public.chama_projects
  FOR ALL USING (
    chama_id IN (SELECT id FROM public.chamas WHERE creator_id = auth.uid())
  );

-- =====================================================
-- ESCROW PARTICIPANTS RLS POLICIES
-- =====================================================

CREATE POLICY "Escrow creators can insert participants" ON public.escrow_participants
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.escrows WHERE id = escrow_id AND creator_id = auth.uid())
  );

CREATE POLICY "Users can view escrow participants" ON public.escrow_participants
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.escrows WHERE id = escrow_id AND (creator_id = auth.uid() OR buyer_id = auth.uid() OR seller_id = auth.uid()))
    OR user_id = auth.uid()
  );

CREATE POLICY "Escrow creators can update participants" ON public.escrow_participants
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.escrows WHERE id = escrow_id AND creator_id = auth.uid())
  );

-- =====================================================
-- ESCROW MILESTONES RLS POLICIES
-- =====================================================

CREATE POLICY "Escrow creators can manage milestones" ON public.escrow_milestones
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.escrows WHERE id = escrow_id AND creator_id = auth.uid())
  );

CREATE POLICY "Escrow participants can view milestones" ON public.escrow_milestones
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.escrows e 
      WHERE e.id = escrow_id 
      AND (e.creator_id = auth.uid() OR e.buyer_id = auth.uid() OR e.seller_id = auth.uid())
    )
  );

-- =====================================================
-- ESCROW TRANSACTIONS RLS POLICIES
-- =====================================================

CREATE POLICY "Escrow participants can view transactions" ON public.escrow_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.escrows e 
      WHERE e.id = escrow_id 
      AND (e.creator_id = auth.uid() OR e.buyer_id = auth.uid() OR e.seller_id = auth.uid())
    )
  );

CREATE POLICY "System can insert escrow transactions" ON public.escrow_transactions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update escrow transactions" ON public.escrow_transactions
  FOR UPDATE USING (true);

-- =====================================================
-- ESCROW DISPUTES RLS POLICIES
-- =====================================================

CREATE POLICY "Escrow participants can manage disputes" ON public.escrow_disputes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.escrows e 
      WHERE e.id = escrow_id 
      AND (e.creator_id = auth.uid() OR e.buyer_id = auth.uid() OR e.seller_id = auth.uid())
    )
  );
