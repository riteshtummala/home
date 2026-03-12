-- RUN THIS IN YOUR SUPABASE SQL EDITOR AFTER CREATING THE ACCOUNT
-- It updates the role of the specified email to 'admin'.

UPDATE public.users 
SET role = 'admin' 
WHERE email = 'ritesh.24bce8173@vitapstudent.ac.in';
