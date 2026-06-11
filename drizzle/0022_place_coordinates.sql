CREATE TABLE IF NOT EXISTS `placeCoordinates` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `name` varchar(255) NOT NULL,
  `address` text,
  `category` enum('attraction','restaurant','school','hotel','transport','other') NOT NULL DEFAULT 'other',
  `latitude` varchar(32) NOT NULL,
  `longitude` varchar(32) NOT NULL,
  `source` enum('manual','resource','geocoded','seed') NOT NULL DEFAULT 'manual',
  `confidence` int NOT NULL DEFAULT 80,
  `notes` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX `idx_placeCoordinates_name` ON `placeCoordinates` (`name`);
CREATE INDEX `idx_placeCoordinates_category` ON `placeCoordinates` (`category`);

INSERT IGNORE INTO `placeCoordinates` (`name`, `address`, `category`, `latitude`, `longitude`, `source`, `confidence`) VALUES
('香港大學', '香港薄扶林香港大學', 'attraction', '22.2830', '114.1370', 'seed', 90),
('香港太空館', '尖沙咀梳士巴利道10號', 'attraction', '22.2941', '114.1718', 'seed', 90),
('尖沙咀星光大道', '尖沙咀星光大道', 'attraction', '22.2930', '114.1757', 'seed', 90),
('維港遊', '香港維多利亞港', 'attraction', '22.2939', '114.1699', 'seed', 90),
('香港海洋公園', '香港島南區黃竹坑道180號', 'attraction', '22.2467', '114.1751', 'seed', 90),
('金紫荊廣場', '灣仔博覽道1號', 'attraction', '22.2840', '114.1737', 'seed', 90),
('香港文化博物館', '沙田文林路1號', 'attraction', '22.3760', '114.1857', 'seed', 90),
('嘉道理農場暨植物園', '香港新界大埔林錦公路', 'attraction', '22.4316', '114.1150', 'seed', 90),
('蓮花山公園', '廣東省深圳市福田區紅荔路6030號', 'attraction', '22.5532', '114.0540', 'seed', 90),
('華大基因時空中心', '深圳市鹽田區梅沙街道濱海社區雲華路9號', 'attraction', '22.6069', '114.3043', 'seed', 90),
('深圳國家基因庫', '廣東省深圳市龍崗區觀音山公園內', 'attraction', '22.6028', '114.4850', 'seed', 90),
('比亞迪雲巴', '坪山雲巴一號線綜合車場', 'attraction', '22.6938', '114.3460', 'seed', 90),
('南方科技大學校園', '廣東省深圳市南山區學苑大道1088號', 'attraction', '22.6006', '113.9997', 'seed', 90),
('香港諾富特世紀酒店宴會廳', '香港灣仔謝斐道238號', 'hotel', '22.2790', '114.1764', 'seed', 90),
('香港國際機場', '香港國際機場', 'transport', '22.3080', '113.9185', 'seed', 90),
('深圳宝安国际机场', '深圳寶安國際機場', 'transport', '22.6393', '113.8107', 'seed', 90),
('深圳寶安國際機場', '深圳寶安國際機場', 'transport', '22.6393', '113.8107', 'seed', 90),
('茗悅軒', '沙田小瀝源路68號廣源商場', 'restaurant', '22.3820', '114.2150', 'seed', 90),
('逸月軒（荃新天地）', '荃灣楊屋道18號荃新天地', 'restaurant', '22.3699', '114.1168', 'seed', 90);
