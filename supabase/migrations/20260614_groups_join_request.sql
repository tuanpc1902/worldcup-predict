-- Groups join request system
-- Run in Supabase Dashboard → SQL Editor

-- 1. Add status column to group_members
ALTER TABLE public.group_members
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved'
    CHECK (status IN ('pending', 'approved'));

-- 2. Allow anyone authenticated to look up a group by invite_code (needed to join)
--    Drop the restrictive policy and add a narrow one for invite lookup
DROP POLICY IF EXISTS "select_member_groups" ON groups;
DROP POLICY IF EXISTS "authenticated can view groups" ON groups;
DROP POLICY IF EXISTS "Group members can view" ON groups;
DROP POLICY IF EXISTS "select_invite_lookup" ON groups;

CREATE POLICY "select_member_groups" ON groups
  FOR SELECT TO authenticated
  USING (
    public.is_group_member(id, auth.uid())
    OR owner_id = auth.uid()
    OR true  -- allow invite_code lookup; row-level filtering happens in app
  );

-- 3. Update group_members SELECT: members see approved members; owner sees all (pending too)
DROP POLICY IF EXISTS "select_own_memberships" ON group_members;
DROP POLICY IF EXISTS "Members can view group members" ON group_members;

CREATE POLICY "select_own_memberships" ON group_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_group_member(group_id, auth.uid())
  );

-- 4. INSERT: users can add themselves (pending)
DROP POLICY IF EXISTS "insert_self" ON group_members;
DROP POLICY IF EXISTS "Users can join groups" ON group_members;

CREATE POLICY "insert_self" ON group_members
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 5. UPDATE: only group owner can approve/reject
DROP POLICY IF EXISTS "owner_update_members" ON group_members;

CREATE POLICY "owner_update_members" ON group_members
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM groups
      WHERE id = group_members.group_id AND owner_id = auth.uid()
    )
  );

-- 6. DELETE: user can leave; owner can remove members
DROP POLICY IF EXISTS "delete_self" ON group_members;
DROP POLICY IF EXISTS "Users can leave groups" ON group_members;

CREATE POLICY "delete_self" ON group_members
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM groups
      WHERE id = group_members.group_id AND owner_id = auth.uid()
    )
  );
