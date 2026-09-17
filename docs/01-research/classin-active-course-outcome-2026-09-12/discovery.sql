-- Phase 0 only. These queries do NOT construct the requested study population.
-- Read-only; StarRocks fallback after Impala metadata and Hive query timeouts.
-- Use eo_pdviews only. Never export student-level records.
-- Knowledge sources: 010, 205, 206, 207; see report for exact titles.

-- snapshot_coverage
SELECT dt, COUNT(1) AS activity_rows FROM eo_pdviews.ods_ms_eo_oslms_lms_activity_df_view WHERE dt = '2026-09-11' GROUP BY dt ORDER BY dt LIMIT 1;

-- class_dates
SELECT dt, COUNT(1) AS rows_n, MIN(class_btime) AS min_start_seconds, MAX(class_btime) AS max_start_seconds FROM eo_pdviews.ods_ms_eo_os_eeo_course_class_di_view WHERE dt >= '2026-09-05' AND dt <= '2026-09-11' GROUP BY dt ORDER BY dt LIMIT 7;

-- activity_states
SELECT biz_type,publish_flag,process_flag,is_deleted,COUNT(1) AS rows_n FROM eo_pdviews.ods_ms_eo_oslms_lms_activity_df_view WHERE dt='2026-09-11' GROUP BY biz_type,publish_flag,process_flag,is_deleted ORDER BY biz_type,publish_flag,process_flag,is_deleted LIMIT 500;

-- class_state_probe
SELECT class_status,COUNT(1) AS rows_n,COUNT(DISTINCT class_id) AS class_n,MIN(class_btime) AS min_start,MAX(class_btime) AS max_start FROM eo_pdviews.ods_ms_eo_os_eeo_course_class_di_view WHERE dt >= '2026-09-05' AND dt <= '2026-09-11' GROUP BY class_status ORDER BY class_status LIMIT 20;

-- homework_dates
SELECT dt,COUNT(1) AS rows_n,MIN(add_time) AS min_created,MAX(update_time) AS max_updated FROM eo_pdviews.ods_ms_eo_oshw_eeo_course_homework_7df_view WHERE dt='2026-09-11' GROUP BY dt ORDER BY dt LIMIT 1;
