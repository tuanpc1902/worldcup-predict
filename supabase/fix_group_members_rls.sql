-- Fix: infinite recursion in group_members RLS policies
-- Run this in Supabase Dashboard → SQL Editor

-- Step 1: Drop all existing policies on group_members
DROP POLICY IF EXISTS "members can view group members" ON group_members;
DROP POLICY IF EXISTS "users can view group members" ON group_members;
DROP POLICY IF EXISTS "group members can view" ON group_members;
DROP POLICY IF EXISTS "owner can manage" ON group_members;
DROP POLICY IF EXISTS "users can join groups" ON group_members;
DROP POLICY IF EXISTS "users can leave groups" ON group_members;

-- Drop any other policies (catch-all)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'group_members' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON group_members', pol.policyname);
  END LOOP;
END $$;

-- Step 2: Create a SECURITY DEFINER helper function to break the recursion.
-- This function runs as the table owner (bypasses RLS) so it won't recurse.
CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id AND user_id = p_user_id
  );
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) TO authenticated;

-- Step 3: Recreate clean policies using the helper function (no self-reference)

-- SELECT: authenticated users can see rows where they are a member of that group
CREATE POLICY "select_own_memberships" ON group_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_group_member(group_id, auth.uid())
  );

-- INSERT: authenticated users can add themselves to a group
CREATE POLICY "insert_self" ON group_members
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- DELETE: users can remove themselves
CREATE POLICY "delete_self" ON group_members
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Also fix groups table policies if needed
DROP POLICY IF EXISTS "authenticated can view groups" ON groups;
DROP POLICY IF EXISTS "owner can manage groups" ON groups;

CREATE POLICY "select_member_groups" ON groups
  FOR SELECT TO authenticated
  USING (
    public.is_group_member(id, auth.uid())
    OR owner_id = auth.uid()
  );

CREATE POLICY "insert_own_group" ON groups
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "update_own_group" ON groups
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "delete_own_group" ON groups
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid());
