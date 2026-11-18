-- Research leads only; no agreement or athlete foreign key is created.
-- Schema: 20260717060045, 20260717065525 and 20260727110030.
-- Full verification and outreach: marketing/outreach-queues/2026-11-19.json
-- Coordinates remain NULL pending verified geocoding. Budgets are annualised AUD.
BEGIN;

INSERT INTO public.sponsors (business_name, merchant_category, budget_allocation, contact_email, postcode, currency)
SELECT 'Chain Reaction Bicycles', 'Bicycle Tech', 3000, NULL, '2230', 'AUD'
WHERE NOT EXISTS (SELECT 1 FROM public.sponsors WHERE business_name = 'Chain Reaction Bicycles' AND postcode = '2230');

INSERT INTO public.sponsors (business_name, merchant_category, budget_allocation, contact_email, postcode, currency)
SELECT 'PedL Cronulla', 'Bicycle Tech', 3500, 'contact@pedl.com.au', '2230', 'AUD'
WHERE NOT EXISTS (SELECT 1 FROM public.sponsors WHERE business_name = 'PedL Cronulla' AND postcode = '2230');

INSERT INTO public.sponsors (business_name, merchant_category, budget_allocation, contact_email, postcode, currency)
SELECT 'Beach Without Sand', 'Coastal Lifestyle', 3500, NULL, '2107', 'AUD'
WHERE NOT EXISTS (SELECT 1 FROM public.sponsors WHERE business_name = 'Beach Without Sand' AND postcode = '2107');

INSERT INTO public.sponsors (business_name, merchant_category, budget_allocation, contact_email, postcode, currency)
SELECT 'Rubira''s', 'Suburban Dining', 3000, 'info@rubiras.com.au', '3207', 'AUD'
WHERE NOT EXISTS (SELECT 1 FROM public.sponsors WHERE business_name = 'Rubira''s' AND postcode = '3207');

INSERT INTO public.sponsors (business_name, merchant_category, budget_allocation, contact_email, postcode, currency)
SELECT 'Shelanous', 'Suburban Dining', 3500, 'info@shelanous.com.au', '3207', 'AUD'
WHERE NOT EXISTS (SELECT 1 FROM public.sponsors WHERE business_name = 'Shelanous' AND postcode = '3207');

INSERT INTO public.sponsors (business_name, merchant_category, budget_allocation, contact_email, postcode, currency)
SELECT 'Ciao Cielo', 'Suburban Dining', 3000, 'admin@ciaocielo.com.au', '3207', 'AUD'
WHERE NOT EXISTS (SELECT 1 FROM public.sponsors WHERE business_name = 'Ciao Cielo' AND postcode = '3207');

INSERT INTO public.sponsors (business_name, merchant_category, budget_allocation, contact_email, postcode, currency)
SELECT 'Bay Beach Pizza & Pasta', 'Suburban Dining', 3500, 'baybeachhospitalityandcatering@gmail.com', '3207', 'AUD'
WHERE NOT EXISTS (SELECT 1 FROM public.sponsors WHERE business_name = 'Bay Beach Pizza & Pasta' AND postcode = '3207');

INSERT INTO public.sponsors (business_name, merchant_category, budget_allocation, contact_email, postcode, currency)
SELECT 'Ultra Tune Newtown', 'Automotive', 3500, 'newtown@ultratune.com.au', '2042', 'AUD'
WHERE NOT EXISTS (SELECT 1 FROM public.sponsors WHERE business_name = 'Ultra Tune Newtown' AND postcode = '2042');

INSERT INTO public.sponsors (business_name, merchant_category, budget_allocation, contact_email, postcode, currency)
SELECT 'Deesse Boutique', 'Apparel', 3000, 'hello@deesse.com.au', '2107', 'AUD'
WHERE NOT EXISTS (SELECT 1 FROM public.sponsors WHERE business_name = 'Deesse Boutique' AND postcode = '2107');

INSERT INTO public.sponsors (business_name, merchant_category, budget_allocation, contact_email, postcode, currency)
SELECT 'Voss Store', 'Apparel', 3000, 'info@vossstore.com.au', '2107', 'AUD'
WHERE NOT EXISTS (SELECT 1 FROM public.sponsors WHERE business_name = 'Voss Store' AND postcode = '2107');

INSERT INTO public.sponsors (business_name, merchant_category, budget_allocation, contact_email, postcode, currency)
SELECT 'Bondi Physiotherapy & Sports Injury Centre', 'Recovery', 3000, NULL, '2026', 'AUD'
WHERE NOT EXISTS (SELECT 1 FROM public.sponsors WHERE business_name = 'Bondi Physiotherapy & Sports Injury Centre' AND postcode = '2026');

INSERT INTO public.sponsors (business_name, merchant_category, budget_allocation, contact_email, postcode, currency)
SELECT 'Pier 35 Bar & Grill', 'Suburban Dining', 3000, NULL, '3207', 'AUD'
WHERE NOT EXISTS (SELECT 1 FROM public.sponsors WHERE business_name = 'Pier 35 Bar & Grill' AND postcode = '3207');

INSERT INTO public.sponsors (business_name, merchant_category, budget_allocation, contact_email, postcode, currency)
SELECT 'Nimbus Co Bondi', 'Recovery', 12500, 'marketing@nimbusco.com.au', '2026', 'AUD'
WHERE NOT EXISTS (SELECT 1 FROM public.sponsors WHERE business_name = 'Nimbus Co Bondi' AND postcode = '2026');

INSERT INTO public.sponsors (business_name, merchant_category, budget_allocation, contact_email, postcode, currency)
SELECT 'Beckenham Optometrist', 'Eyewear', 3000, NULL, '2107', 'AUD'
WHERE NOT EXISTS (SELECT 1 FROM public.sponsors WHERE business_name = 'Beckenham Optometrist' AND postcode = '2107');

INSERT INTO public.sponsors (business_name, merchant_category, budget_allocation, contact_email, postcode, currency)
SELECT 'Eyecare Plus Avalon Beach', 'Eyewear', 3500, 'avalonbeach@eyecareplus.com.au', '2107', 'AUD'
WHERE NOT EXISTS (SELECT 1 FROM public.sponsors WHERE business_name = 'Eyecare Plus Avalon Beach' AND postcode = '2107');

COMMIT;
