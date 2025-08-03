-- 示例数据种子文件

-- 插入示例用户
INSERT INTO users (username, email, password_hash, role) VALUES
('teacher_demo', 'teacher@example.com', '$2a$10$example_hash', 'teacher'),
('student_demo', 'student@example.com', '$2a$10$example_hash', 'student');

-- 插入示例项目
INSERT INTO projects (user_id, name, description, status) VALUES
(2, '我的第一个假新闻识别项目', '学习识别关于健康类的假新闻', 'collecting');

-- 插入示例真实新闻文本
INSERT INTO text_samples (project_id, content, label, source, word_count, quality_score) VALUES
(1, '世界卫生组织今日发布最新研究报告，显示规律运动可以显著降低心血管疾病风险。该研究跟踪了50,000名参与者长达10年时间，发现每周进行150分钟中等强度运动的人群，心脏病发病率比不运动人群低35%。研究负责人约翰·史密斯博士表示，这一发现为公共卫生政策提供了重要依据。', 'real', 'WHO官方网站', 89, 0.92),
(1, '美国疾控中心发布声明，确认新冠疫苗的安全性和有效性。经过大规模临床试验和持续监测，数据显示疫苗在预防重症和死亡方面表现出色。专家建议符合条件的人群及时接种疫苗，以保护自己和他人的健康。', 'real', 'CDC官网', 76, 0.88);

-- 插入示例假新闻文本
INSERT INTO text_samples (project_id, content, label, source, word_count, quality_score) VALUES
(1, '震惊！某神秘东方古法，三天内彻底治愈癌症！西医不敢告诉你的秘密！马上转发给你关心的人！不转不是中国人！这个方法太简单了，只需要每天喝这种水就够了！', 'fake', '微信朋友圈', 67, 0.15),
(1, '重大发现！科学家证实5G信号会改变人类DNA！政府隐瞒真相多年！快看这个视频就明白了！一定要告诉所有人！', 'fake', '某自媒体', 54, 0.12);