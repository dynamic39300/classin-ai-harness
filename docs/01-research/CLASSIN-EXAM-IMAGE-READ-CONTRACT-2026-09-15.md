---
title: 测验题干图片读取合同
date: 2026-09-15
status: VERIFIED_TEST_READING_AND_PREVIEW
truth_label: TEST_API_AND_ACTUAL_BYTES
---

# 测验题干图片读取合同

PRD R3/R5/R6 → Feature Spec §19 → Ticket CI-008j。2026-09-15读取Apifox私有实例项目345268/3487332，POST /topic/batchGet，表单topicQuery为题ID及来源数组。教师先读取已授权测验的paperInfo，再批量取得同一试卷的题目；不能任意枚举题库。

首讲第9、10题的content为图片HTML，各有一个相对/upload/files/file01/路径，topicSource=2，sensitive=0，permissions包含check/download。题目图片使用已验证测试资源基址https://wsevlf001.eeo.im，无业务凭据传给资源域。两次实际GET均HTTP200、没有重定向；服务器MIME为application/octet-stream，字节验证为PNG，均1200×760。

| 题序 | 字节数 | SHA-256 |
| --- | ---: | --- |
| 9 | 45136 | 4e4feba52f099f232464912585eee3e39ef723a594576e397edf013fdc4a846a |
| 10 | 42793 | 81a77f131b20df005c1b0dfa73a0e914e30bdb153d915e184c0b2a12b4762e0b |

人工查看第9题原图：有理数裂项求和，要求写出拆项与抵消过程，图上明确标注AI生成测试数据。来源是实际题库返回引用及资源响应，没有用本地生成图替代上游。图片能显示与模型能识别图片分开，本票仅完成教师预览。

该引用不是LMS的lmsFileId，不能套用getFiles关系。实现应依据新鲜试卷、题ID/题源和题库权限授权，验证引用版本后复用固定域下载；不渲染原始题干HTML。文档对sensitive其他值未提供足够含义，因此仅接受当前已验证0；其他值拒绝图片读取，不解释完整枚举。

原始文档、题目JSON、下载图与探测结果保留在忽略目录private/exam-images/，目录0700/文件0600。本报告后续追加V2与反例验证结果。

## 查询源与返回源差异

首次V2验证没有取得预期14张题图。首讲详情中的images为空，定位到实现错误地要求两个topicSource相等。重新实测7份试卷70题：paperInfo中查询源均为0，batchGet返回源均为2，14张图片题亦同；全部sensitive=0且有check/download。查询与返回是当前已验证的0→2对应关系，不把它们解释为同一枚举，不用返回2覆盖查询0。原始source-pairs.json与首次verify.log留证。实现按Spec仅支持这个确定组合，未知组合拒绝。

## V2实际验证

04:36完成7份测验共14张题图读取，全部HTTP200、PNG、1200×760，共792858字节。每张均重新从所属试卷/题目取得原始引用，与V2媒体响应逐字节相等；BFF读取中位1193ms、最大1457ms。首讲第9题实际Chrome显示、打开原图新页、关闭均通过，无页面错误或横向溢出。

实际请求反例：未知活动、非测验活动、未知题目、错误版本引用、覆盖uid、外部url参数全部403。Context回读不含图片引用或资源地址。没有上传、更改试题或学生答案，也没有声称AI已识别图片。

本机证据：media-verification.json逐图字节/hash/耗时，browser-verification.json和question-preview.png记录UI；verify-first-failure.log保留源字段相等检查导致的首次失败。自动化覆盖相同题ID的不同题源、权限/审核变化、题干/版本变化、重复试题、非法HTML属性/路径、伪装文件、尺寸上限与媒体路由；全量检查和E2E最终结果见REGRESSION。
