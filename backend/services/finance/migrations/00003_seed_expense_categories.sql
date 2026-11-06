-- +goose Up
INSERT INTO finance.expense_category (id, name_en, name_ar, code, sort_order) VALUES
    ('expcat-01', 'Equipment & Gear Rentals', 'استئجار معدات وكاميرات', 'gear_rental', 1),
    ('expcat-02', 'Crew & Talent Wages', 'أجور الطواقم والممثلين', 'crew_wages', 2),
    ('expcat-03', 'Travel & Location Logistics', 'سفر ونقل وإعاشة', 'travel_logistics', 3),
    ('expcat-04', 'Studio Lease & Utilities', 'إيجار ومصاريف الاستوديو', 'studio_overhead', 4),
    ('expcat-05', 'Software, Storage & Cloud', 'برمجيات واشتراكات وسحابة', 'software_licenses', 5),
    ('expcat-06', 'Marketing & Festival Submissions', 'تسويق ومشاركات مهرجانات', 'marketing_pr', 6),
    ('expcat-07', 'Salaries & Wages', 'الرواتب والأجور', 'salaries', 7),
    ('expcat-08', 'Pensions & Social Insurance', 'التأمينات الاجتماعية', 'gosi', 8),
    ('expcat-09', 'Staff Benefits & Allowances', 'مزايا وبدلات الموظفين', 'staff_benefits', 9),
    ('expcat-10', 'Sales Commissions & Incentives', 'عمولات وحوافز المبيعات', 'commissions', 10),
    ('expcat-28', 'Other Expenses', 'مصروفات أخرى', 'other', 28)
ON CONFLICT (id) DO NOTHING;

-- +goose Down
DELETE FROM finance.expense_category WHERE id LIKE 'expcat-%';
