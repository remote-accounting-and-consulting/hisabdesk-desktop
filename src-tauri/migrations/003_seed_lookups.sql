INSERT INTO registration_types (name, sort_order) VALUES
('Committees',1),('Cooperative',2),('Proprietor',3),('Pvt. Ltd.',4),
('Public Limited',5),('NGO/INGO',6),('Education Institution',7),('Other',99);

INSERT INTO business_categories (name, sort_order) VALUES
('Construction',1),('Cooperative',2),('Trading',3),('Media',4),('Hotel & Restaurant',5),
('Hydro',6),('Committee',7),('Agriculture',8),('NGO/INGO',9),('Hospital & Pharmacy',10),
('School/College',11),('Other',99);

INSERT INTO services (name, default_fee, is_recurring, recurrence_type) VALUES
('Audit',50000,1,'yearly'),
('VAT Return',3000,1,'monthly'),
('Projection',10000,0,NULL),
('Proposal Writing',15000,0,NULL),
('Bookkeeping',15000,1,'monthly'),
('Tax Clearance',5000,1,'yearly'),
('Other Verification & Certification',5000,0,NULL);

INSERT INTO document_types (name, sort_order) VALUES
('PAN', 1),
('Citizenship Certificate', 2),
('Company Registration Certificate', 3),
('Darta Certificate', 4),
('Purchase & Expense Bills', 5),
('Sales Bills', 6),
('Bank Statement', 7),
('Previous Year Audit Report', 8),
('Party Confirmation', 9),
('Loan & Interest Certificate', 10);

INSERT INTO settings (key, value) VALUES
('company_name','Remote Accounting and Consulting Pvt. Ltd.'),
('company_pan',''),
('company_address',''),
('fiscal_year','2083/84'),
('currency','Rs.'),
('files_root_path','');
