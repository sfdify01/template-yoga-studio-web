-- Script to copy data from production to test Supabase
-- Run this script in the TEST database after setting up foreign data wrapper

-- First, create foreign data wrapper to production database
CREATE EXTENSION IF NOT EXISTS postgres_fdw;

-- Create server connection to production
DROP SERVER IF EXISTS production_server CASCADE;
CREATE SERVER production_server
  FOREIGN DATA WRAPPER postgres_fdw
  OPTIONS (host 'aws-0-us-east-1.pooler.supabase.com', port '6543', dbname 'postgres', sslmode 'require');

-- Create user mapping
DROP USER MAPPING IF EXISTS FOR CURRENT_USER SERVER production_server;
CREATE USER MAPPING FOR CURRENT_USER
  SERVER production_server
  OPTIONS (user 'postgres.cdfllxxtgguyveowmdis', password 'lphESYpoATtGEHqLnACpSjusFJzSZLbw');

-- Import foreign schema
DROP SCHEMA IF EXISTS prod_data CASCADE;
CREATE SCHEMA prod_data;
IMPORT FOREIGN SCHEMA public
  FROM SERVER production_server
  INTO prod_data;

-- Copy tenants data
TRUNCATE public.tenants CASCADE;
INSERT INTO public.tenants SELECT * FROM prod_data.tenants;

-- Copy menu_categories data
TRUNCATE public.menu_categories CASCADE;
INSERT INTO public.menu_categories SELECT * FROM prod_data.menu_categories;

-- Copy menu_items data
TRUNCATE public.menu_items CASCADE;
INSERT INTO public.menu_items SELECT * FROM prod_data.menu_items;

-- Copy menu_modifiers data
TRUNCATE public.menu_modifiers CASCADE;
INSERT INTO public.menu_modifiers SELECT * FROM prod_data.menu_modifiers;

-- Copy menu_modifier_options data
TRUNCATE public.menu_modifier_options CASCADE;
INSERT INTO public.menu_modifier_options SELECT * FROM prod_data.menu_modifier_options;

-- Copy menu_item_modifiers data
TRUNCATE public.menu_item_modifiers CASCADE;
INSERT INTO public.menu_item_modifiers SELECT * FROM prod_data.menu_item_modifiers;

-- Copy blog_posts data
TRUNCATE public.blog_posts CASCADE;
INSERT INTO public.blog_posts SELECT * FROM prod_data.blog_posts;

-- Copy delivery_zones data
TRUNCATE public.delivery_zones CASCADE;
INSERT INTO public.delivery_zones SELECT * FROM prod_data.delivery_zones;

-- Copy store_settings data
TRUNCATE public.store_settings CASCADE;
INSERT INTO public.store_settings SELECT * FROM prod_data.store_settings;

-- Clean up
DROP SCHEMA prod_data CASCADE;
DROP SERVER production_server CASCADE;