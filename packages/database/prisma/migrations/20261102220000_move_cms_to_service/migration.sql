-- Migration: move CMS content from public tables to cms schema
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'CmsPage') THEN
        INSERT INTO cms.page (
            id, slug, page_type, title_en, title_ar,
            seo_title_en, seo_title_ar, seo_description_en, seo_description_ar,
            blocks, is_visible, in_header, in_footer, sort_order, created_at, updated_at
        )
        SELECT
            id, slug, "pageType", "titleEn", "titleAr",
            "seoTitleEn", "seoTitleAr", "seoDescriptionEn", "seoDescriptionAr",
            blocks, "isVisible", "inHeader", "inFooter", "sortOrder", "createdAt", "updatedAt"
        FROM public."CmsPage"
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'CmsArticle') THEN
        INSERT INTO cms.article (
            id, slug, title_en, title_ar, excerpt_en, excerpt_ar,
            body_en, body_ar, body_html_en, body_html_ar, cover_url,
            category, tags, author_name, status, publish_at, featured,
            seo_title_en, seo_title_ar, seo_description_en, seo_description_ar,
            created_at, updated_at
        )
        SELECT
            id, slug, "titleEn", "titleAr", "excerptEn", "excerptAr",
            "bodyEn", "bodyAr", "bodyHtmlEn", "bodyHtmlAr", "coverUrl",
            category, tags, "authorName", status, "publishAt", featured,
            "seoTitleEn", "seoTitleAr", "seoDescriptionEn", "seoDescriptionAr",
            "createdAt", "updatedAt"
        FROM public."CmsArticle"
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Review') THEN
        INSERT INTO cms.review (
            id, author_en, author_ar, company_en, company_ar,
            quote_en, quote_ar, rating, is_approved, sort_order, year, created_at
        )
        SELECT
            id, "authorEn", "authorAr", "companyEn", "companyAr",
            "quoteEn", "quoteAr", rating, "isApproved", "sortOrder", year, "createdAt"
        FROM public."Review"
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Faq') THEN
        INSERT INTO cms.faq (
            id, question_en, question_ar, answer_en, answer_ar,
            category, is_published, sort_order, created_at
        )
        SELECT
            id, "questionEn", "questionAr", "answerEn", "answerAr",
            category, "isPublished", "sortOrder", "createdAt"
        FROM public."Faq"
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Statistic') THEN
        INSERT INTO cms.statistic (
            id, metric_value, label_en, label_ar, sub_label_en, sub_label_ar, icon, sort_order
        )
        SELECT
            id, value, "labelEn", "labelAr", "subLabelEn", "subLabelAr", icon, "sortOrder"
        FROM public."Statistic"
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'WebsiteContent') THEN
        INSERT INTO cms.content_snapshot (
            id, draft, published, revision, published_at, updated_at
        )
        SELECT
            id, draft, published, revision, "publishedAt", "updatedAt"
        FROM public."WebsiteContent"
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;
