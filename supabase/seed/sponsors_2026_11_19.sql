-- RESEARCH ONLY. DO NOT EXECUTE OR IMPORT. No consent obtained; do not send.
-- Area prospects only; no endorsement, media rights, agreement or talent linkage.
-- sponsors cannot store research_only/do_not_send safeguards; separate approval is required.
-- Source and area details: marketing/outreach-queues/2026-11-19.json
-- Existing schema: 20260717060045, 20260717065525, 20260727110030.
-- Budgets are annualised; Wellington uses nominal NZD, not converted AUD.
-- Coordinates remain NULL pending separate verified geocoding.
BEGIN;

INSERT INTO public.sponsors (business_name, merchant_category, budget_allocation, contact_email, postcode, currency)
SELECT 'Aushealth Physiotherapy', 'Physiotherapy', 3000, NULL, '2100', 'AUD'
WHERE NOT EXISTS (SELECT 1 FROM public.sponsors WHERE business_name = 'Aushealth Physiotherapy' AND postcode = '2100');

INSERT INTO public.sponsors (business_name, merchant_category, budget_allocation, contact_email, postcode, currency)
SELECT 'Rebound Health Brookvale', 'Allied Health', 3500, 'reception@reboundhealth.com.au', '2100', 'AUD'
WHERE NOT EXISTS (SELECT 1 FROM public.sponsors WHERE business_name = 'Rebound Health Brookvale' AND postcode = '2100');

INSERT INTO public.sponsors (business_name, merchant_category, budget_allocation, contact_email, postcode, currency)
SELECT '99 Bikes Brookvale', 'Bicycle Retail and Servicing', 3500, 'brookvale@99bikes.com.au', '2100', 'AUD'
WHERE NOT EXISTS (SELECT 1 FROM public.sponsors WHERE business_name = '99 Bikes Brookvale' AND postcode = '2100');

INSERT INTO public.sponsors (business_name, merchant_category, budget_allocation, contact_email, postcode, currency)
SELECT 'Beaufort Physiotherapy', 'Physiotherapy', 3000, 'reception@beaufortphysio.com.au', '6050', 'AUD'
WHERE NOT EXISTS (SELECT 1 FROM public.sponsors WHERE business_name = 'Beaufort Physiotherapy' AND postcode = '6050');

INSERT INTO public.sponsors (business_name, merchant_category, budget_allocation, contact_email, postcode, currency)
SELECT 'Trained Physio and Fitness', 'Physiotherapy and Fitness', 3000, 'hello@trainedphysioperth.com.au', '6004', 'AUD'
WHERE NOT EXISTS (SELECT 1 FROM public.sponsors WHERE business_name = 'Trained Physio and Fitness' AND postcode = '6004');

INSERT INTO public.sponsors (business_name, merchant_category, budget_allocation, contact_email, postcode, currency)
SELECT 'Dalman Physiotherapy', 'Physiotherapy', 3500, 'dalmanphysio@gmail.com', '6011', 'NZD'
WHERE NOT EXISTS (SELECT 1 FROM public.sponsors WHERE business_name = 'Dalman Physiotherapy' AND postcode = '6011');

INSERT INTO public.sponsors (business_name, merchant_category, budget_allocation, contact_email, postcode, currency)
SELECT 'CBD Physio', 'Physiotherapy', 3000, 'contact@cbdphysio.co.nz', '6011', 'NZD'
WHERE NOT EXISTS (SELECT 1 FROM public.sponsors WHERE business_name = 'CBD Physio' AND postcode = '6011');

INSERT INTO public.sponsors (business_name, merchant_category, budget_allocation, contact_email, postcode, currency)
SELECT 'Central City Physiotherapy Clinic', 'Physiotherapy', 3000, 'info@ccphysio.co.nz', '6011', 'NZD'
WHERE NOT EXISTS (SELECT 1 FROM public.sponsors WHERE business_name = 'Central City Physiotherapy Clinic' AND postcode = '6011');

INSERT INTO public.sponsors (business_name, merchant_category, budget_allocation, contact_email, postcode, currency)
SELECT 'The Spinal Studio Werribee', 'Allied Health', 3500, 'werribee@thespinalstudio.com.au', '3030', 'AUD'
WHERE NOT EXISTS (SELECT 1 FROM public.sponsors WHERE business_name = 'The Spinal Studio Werribee' AND postcode = '3030');

INSERT INTO public.sponsors (business_name, merchant_category, budget_allocation, contact_email, postcode, currency)
SELECT 'Enrich Physio Werribee', 'Physiotherapy', 3500, NULL, '3030', 'AUD'
WHERE NOT EXISTS (SELECT 1 FROM public.sponsors WHERE business_name = 'Enrich Physio Werribee' AND postcode = '3030');

INSERT INTO public.sponsors (business_name, merchant_category, budget_allocation, contact_email, postcode, currency)
SELECT 'The Physio Studio', 'Physiotherapy', 3000, 'admin@thephysiostudio.com.au', '5034', 'AUD'
WHERE NOT EXISTS (SELECT 1 FROM public.sponsors WHERE business_name = 'The Physio Studio' AND postcode = '5034');

INSERT INTO public.sponsors (business_name, merchant_category, budget_allocation, contact_email, postcode, currency)
SELECT 'Empowered Neurodivergence Physiotherapy', 'Physiotherapy', 3000, 'admin@empoweredneurodivergencephysiotherapy.com.au', '5034', 'AUD'
WHERE NOT EXISTS (SELECT 1 FROM public.sponsors WHERE business_name = 'Empowered Neurodivergence Physiotherapy' AND postcode = '5034');

INSERT INTO public.sponsors (business_name, merchant_category, budget_allocation, contact_email, postcode, currency)
SELECT 'Warners Bay Physiotherapy', 'Physiotherapy', 3000, 'reception@warnersbayphysiotherapy.com.au', '2282', 'AUD'
WHERE NOT EXISTS (SELECT 1 FROM public.sponsors WHERE business_name = 'Warners Bay Physiotherapy' AND postcode = '2282');

INSERT INTO public.sponsors (business_name, merchant_category, budget_allocation, contact_email, postcode, currency)
SELECT 'Bay Bike Co', 'Bicycle Retail and Servicing', 3000, 'sales@baybikeco.com.au', '2282', 'AUD'
WHERE NOT EXISTS (SELECT 1 FROM public.sponsors WHERE business_name = 'Bay Bike Co' AND postcode = '2282');

INSERT INTO public.sponsors (business_name, merchant_category, budget_allocation, contact_email, postcode, currency)
SELECT '99 Bikes Warners Bay', 'Bicycle Retail and Servicing', 3500, 'warners.bay@99bikes.com.au', '2282', 'AUD'
WHERE NOT EXISTS (SELECT 1 FROM public.sponsors WHERE business_name = '99 Bikes Warners Bay' AND postcode = '2282');

COMMIT;
