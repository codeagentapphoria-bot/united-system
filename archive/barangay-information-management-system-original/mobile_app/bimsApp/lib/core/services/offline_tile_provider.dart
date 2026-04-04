import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import '../../data/database/database_helper.dart';

/// Custom tile provider for offline tiles
class OfflineTileProvider extends TileProvider {
  final DatabaseHelper _dbHelper = DatabaseHelper.instance;
  final String barangayId;

  OfflineTileProvider({required this.barangayId});

  @override
  ImageProvider getImage(TileCoordinates coordinates, TileLayer options) {
    return OfflineTileImage(
      zoom: coordinates.z,
      x: coordinates.x,
      y: coordinates.y,
      barangayId: barangayId,
      dbHelper: _dbHelper,
    );
  }

  @override
  String getTileUrl(TileCoordinates coordinates, TileLayer options) {
    // Return a placeholder URL that won't be used since we override getImage
    return 'offline://${coordinates.z}/${coordinates.x}/${coordinates.y}';
  }
}

/// Custom tile image provider that loads tiles from SQLite
class OfflineTileImage extends ImageProvider<OfflineTileImage> {
  final int zoom;
  final int x;
  final int y;
  final String barangayId;
  final DatabaseHelper dbHelper;
  
  OfflineTileImage({
    required this.zoom, 
    required this.x, 
    required this.y,
    required this.barangayId,
    required this.dbHelper,
  });
  
  Future<ImageInfo> load(OfflineTileImage key, ImageDecoderCallback decode) async {
    try {
      final tileData = await dbHelper.loadMapTile(key.barangayId, key.zoom, key.x, key.y);
      
      if (tileData != null && tileData.isNotEmpty) {
        final codec = await ui.instantiateImageCodec(tileData);
        final frame = await codec.getNextFrame();
        return ImageInfo(image: frame.image);
      }
      
      // If tile not found, return a placeholder instead of throwing
      return await _createPlaceholderTile();
    } catch (e) {
      // Return placeholder instead of rethrowing to prevent crashes
      return await _createPlaceholderTile();
    }
  }

  Future<ImageInfo> _createPlaceholderTile() async {
    final recorder = ui.PictureRecorder();
    final canvas = Canvas(recorder);
    final paint = Paint()
      ..color = Colors.grey[300]!
      ..style = PaintingStyle.fill;
    
    canvas.drawRect(
      const Rect.fromLTWH(0, 0, 256, 256),
      paint,
    );
    
    final textPainter = TextPainter(
      text: const TextSpan(
        text: 'Offline',
        style: TextStyle(
          color: Colors.grey,
          fontSize: 12,
        ),
      ),
      textDirection: TextDirection.ltr,
    );
    
    textPainter.layout();
    textPainter.paint(
      canvas,
      Offset(
        (256 - textPainter.width) / 2,
        (256 - textPainter.height) / 2,
      ),
    );
    
    final picture = recorder.endRecording();
    final image = await picture.toImage(256, 256);
    
    return ImageInfo(image: image);
  }
  
  ImageStreamCompleter loadImage(OfflineTileImage key, ImageDecoderCallback decode) {
    return OneFrameImageStreamCompleter(load(key, decode));
  }
  
  @override
  Future<OfflineTileImage> obtainKey(ImageConfiguration configuration) {
    return Future.value(this);
  }
  
  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is OfflineTileImage &&
        other.zoom == zoom &&
        other.x == x &&
        other.y == y &&
        other.barangayId == barangayId;
  }
  
  @override
  int get hashCode => Object.hash(zoom, x, y, barangayId);
}

/// Fallback tile provider that shows a placeholder when offline tiles are not available
class FallbackTileProvider extends TileProvider {
  FallbackTileProvider() : super();

  @override
  ImageProvider getImage(TileCoordinates coordinates, TileLayer options) {
    return const PlaceholderTileImage();
  }
}

/// Placeholder tile image for missing tiles
class PlaceholderTileImage extends ImageProvider<PlaceholderTileImage> {
  const PlaceholderTileImage();
  
  Future<ImageInfo> load(PlaceholderTileImage key, ImageDecoderCallback decode) async {
    // Create a simple placeholder tile
    final recorder = ui.PictureRecorder();
    final canvas = Canvas(recorder);
    final paint = Paint()
      ..color = Colors.grey[300]!
      ..style = PaintingStyle.fill;
    
    canvas.drawRect(
      const Rect.fromLTWH(0, 0, 256, 256),
      paint,
    );
    
    final textPainter = TextPainter(
      text: const TextSpan(
        text: 'No Tile',
        style: TextStyle(
          color: Colors.grey,
          fontSize: 12,
        ),
      ),
      textDirection: TextDirection.ltr,
    );
    
    textPainter.layout();
    textPainter.paint(
      canvas,
      Offset(
        (256 - textPainter.width) / 2,
        (256 - textPainter.height) / 2,
      ),
    );
    
    final picture = recorder.endRecording();
    final image = await picture.toImage(256, 256);
    
    return ImageInfo(image: image);
  }
  
  ImageStreamCompleter loadImage(PlaceholderTileImage key, ImageDecoderCallback decode) {
    return OneFrameImageStreamCompleter(load(key, decode));
  }
  
  @override
  Future<PlaceholderTileImage> obtainKey(ImageConfiguration configuration) {
    return Future.value(this);
  }
  
  @override
  bool operator ==(Object other) {
    return other is PlaceholderTileImage;
  }
  
  @override
  int get hashCode => 0;
}
