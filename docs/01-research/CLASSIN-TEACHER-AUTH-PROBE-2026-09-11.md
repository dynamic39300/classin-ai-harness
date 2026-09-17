# Teacher read-only authentication probe

Environment: https://dynamic14.eeo.im. Credentials stored only in the skill-designated user configuration, with mode 0600. No credentials or personal records included here.

- Signed POST /course/app/member/course_list succeeded (errno=1). Two membership records returned; roles differ, so these must not both be called teacher classes.
- Selected the membership with identity=192 (class head-teacher context). POST /lms/app/category/list succeeded and returned three categories.
- POST /lms/app/course/unitList succeeded for all three categories; each returned one default unit with activityCount=0 and activityNum=0.
- Activity detail, exam records and recorded-video learning progress cannot be validated without existing activities. No business writes performed.
