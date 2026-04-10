import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  PanResponder,
  Animated,
  Image,
} from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Map Image Size: 1184 × 864
const mapImageSize = { width: 1184, height: 864 };

// Define container size to match the original map image aspect ratio (1184×864)
const mapAspectRatio = mapImageSize.width / mapImageSize.height; // ≈ 1.37
const containerWidth = screenWidth - 40;
const containerHeight = Math.round(containerWidth / mapAspectRatio);
const containerSize = { width: containerWidth, height: containerHeight };

const CustomMapComponent = ({ isVisible, onClose, onLocationSelect }) => {
  // Since the map is 2x larger than viewport, center it by offsetting by half the extra size
  const centerX = -(containerSize.width * 0.5); // Move left by half the container width
  const centerY = -(containerSize.height * 0.5); // Move up by half the container height
  
  const pan = useRef(new Animated.ValueXY({ x: centerX, y: centerY })).current;
  const scale = useRef(new Animated.Value(1)).current;
  const [showControls, setShowControls] = useState(true);
  const [selectedPin, setSelectedPin] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [customPin, setCustomPin] = useState(null);
  const [isDraggingCustomPin, setIsDraggingCustomPin] = useState(false);
  const [showCustomPinOption, setShowCustomPinOption] = useState(false);

  // Get current scale value for pin scaling
  const [currentScale, setCurrentScale] = useState(1);
  
  // Update current scale when scale animation changes
  React.useEffect(() => {
    const listener = scale.addListener(({ value }) => {
      setCurrentScale(value);
    });
    
    return () => scale.removeListener(listener);
  }, [scale]);

  const locations = [
    { id: 5, name: 'School', x: 777, y: 614, type: 'educational', description: 'Pickup location 5' },
    { id: 6, name: 'Park', x: 812, y: 523, type: 'commercial', description: 'Pickup location 6' },
    { id: 7, name: 'MyCycle+', x: 704, y: 815, type: 'industrial', description: 'Pickup location 7' },
    { id: 8, name: 'Library', x: 743, y: 352, type: 'government', description: 'Pickup location 8' },
    { id: 9, name: 'Hospital', x: 775, y: 334, type: 'medical', description: 'Pickup location 9' },
    { id: 10, name: 'City Hall', x: 472, y: 187, type: 'community', description: 'Pickup location 10' },
    { id: 12, name: 'Residential Zone A left', x: 524, y: 169, type: 'residential', description: 'Pickup location 12' },
    { id: 13, name: 'Residential Zone A right', x: 704, y: 119, type: 'residential', description: 'Pickup location 13' },
    { id: 14, name: 'City Park', x: 1020, y: 394, type: 'community', description: 'Pickup location 14' },
    { id: 15, name: 'Industrial Zone', x: 191, y: 511, type: 'industrial', description: 'Pickup location 15' },
    { id: 16, name: 'Pudek Residential', x: 334, y: 485, type: 'residential', description: 'Pickup location 16' },
    { id: 17, name: 'Commercial District', x: 590, y: 430, type: 'commercial', description: 'Pickup location 17' },
    { id: 18, name: 'School 2', x: 661, y: 579, type: 'government', description: 'Pickup location 18' }
  ];

  const getTypeColor = (type) => {
    const colors = {
      residential: '#4CAF50',
      commercial: '#2196F3', 
      industrial: '#FF9800',
      educational: '#9C27B0',
      medical: '#F44336',
      government: '#795548',
      community: '#607D8B',
      custom: '#9B59B6'
    };
    return colors[type] || '#757575';
  };

  const getScaledPosition = (x, y) => {
    const mapWidth = containerSize.width * 2; // Use the larger map size
    const mapHeight = containerSize.height * 2;
    const scaleX = mapWidth / mapImageSize.width;
    const scaleY = mapHeight / mapImageSize.height;
    
    return {
      left: x * scaleX - 12,
      top: y * scaleY - 12,
    };
  };

  const convertScreenToMapCoordinates = (screenX, screenY) => {
    const mapWidth = containerSize.width * 2; // Use the larger map size
    const mapHeight = containerSize.height * 2;
    const scaleX = mapWidth / mapImageSize.width;
    const scaleY = mapHeight / mapImageSize.height;
    
    return {
      mapX: screenX / scaleX,
      mapY: screenY / scaleY,
      displayX: screenX,
      displayY: screenY
    };
  };

  const isValidMapCoordinate = (x, y) => {
    const mapWidth = containerSize.width * 2;
    const mapHeight = containerSize.height * 2;
    return x >= 0 && x <= mapWidth && y >= 0 && y <= mapHeight;
  };

  const handleMapTouch = (event) => {
    if (!showCustomPinOption) return;
    
    const { locationX, locationY } = event.nativeEvent;
    
    if (isValidMapCoordinate(locationX, locationY)) {
      // Use the touch coordinates directly as display coordinates
      // and calculate the corresponding map coordinates for reference
      const mapWidth = containerSize.width * 2;
      const mapHeight = containerSize.height * 2;
      const scaleX = mapWidth / mapImageSize.width;
      const scaleY = mapHeight / mapImageSize.height;
      
      // Convert display coordinates back to map image coordinates
      const mapX = (locationX + 12) / scaleX; // Add 12 to account for pin centering offset
      const mapY = (locationY + 12) / scaleY; // Add 12 to account for pin centering offset
      
      setCustomPin({
        displayX: locationX,
        displayY: locationY,
        mapX: mapX,
        mapY: mapY,
        id: 'custom',
        type: 'custom',
        name: `(${Math.round(mapX)}, ${Math.round(mapY)})`,
        description: 'Custom pickup location'
      });
      
      // Auto-select the custom pin
      setSelectedPin('custom');
      setSelectedLocation({
        displayX: locationX,
        displayY: locationY,
        mapX: mapX,
        mapY: mapY,
        id: 'custom',
        type: 'custom',
        name: `(${Math.round(mapX)}, ${Math.round(mapY)})`,
        description: 'Custom pickup location'
      });
    }
  };

  const handleCustomPinPress = () => {
    if (customPin) {
      Alert.alert(
        'Custom Pin Location',
        `Coordinates: (${Math.round(customPin.mapX)}, ${Math.round(customPin.mapY)})`,
        [
          { text: 'Remove Pin', onPress: () => setCustomPin(null) },
          { text: 'Select This Location', onPress: () => handleLocationSelect(customPin) },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    }
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      pan.setOffset({
        x: pan.x._value,
        y: pan.y._value,
      });
      pan.setValue({ x: 0, y: 0 });
    },
    onPanResponderMove: Animated.event(
      [null, { dx: pan.x, dy: pan.y }],
      { useNativeDriver: false }
    ),
    onPanResponderRelease: () => {
      pan.flattenOffset();
    },
  });

  const handleZoomIn = () => {
    Animated.spring(scale, {
      toValue: Math.min(scale._value * 1.2, 3),
      useNativeDriver: false,
    }).start();
  };

  const handleZoomOut = () => {
    Animated.spring(scale, {
      toValue: Math.max(scale._value * 0.8, 0.5),
      useNativeDriver: false,
    }).start();
  };

  const resetMap = () => {
    // Reset to center position
    const centerX = -(containerSize.width * 0.5);
    const centerY = -(containerSize.height * 0.5);
    
    Animated.parallel([
      Animated.spring(pan, {
        toValue: { x: centerX, y: centerY },
        useNativeDriver: false,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const handleLocationPress = (location) => {
    setSelectedPin(location.id);
    setSelectedLocation(location);
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Select Pickup Location</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.mapContainer}>
            {showCustomPinOption && (
              <View style={styles.customPinOverlay}>
                <Text style={styles.overlayText}>🎯 Tap anywhere to place pin</Text>
              </View>
            )}
            <View style={styles.mapViewport}>
              <View 
                style={styles.panContainer}
                {...panResponder.panHandlers}
              >
                <Animated.View 
                  style={[
                    styles.interactiveMap,
                    {
                      transform: [
                        { translateX: pan.x },
                        { translateY: pan.y },
                        { scale: scale }
                      ]
                    }
                  ]}
                >
                  <View style={styles.cityMap}>
                    {/* Actual City Map Image */}
                    <Image 
                      source={require('./assets/city-map.png')} 
                      style={styles.mapImage}
                      resizeMode="stretch"
                    />

                    {/* Custom Pin Touch Overlay - only show when custom pin mode is active */}
                    {showCustomPinOption && (
                      <View
                        style={styles.mapTouchOverlay}
                        onTouchEnd={handleMapTouch}
                        pointerEvents="auto"
                      />
                    )}

                  {/* Location Pins */}
                  {locations.map((location) => {
                    const position = getScaledPosition(location.x, location.y);
                    const isSelected = selectedPin === location.id;
                    // Better scaling: keep pins visible but smaller when zoomed in
                    const pinScale = Math.max(0.7, Math.min(1.2, 1.2 / currentScale));
                    
                    return (
                      <TouchableOpacity
                        key={location.id}
                        style={[
                          styles.locationPin,
                          position,
                          { 
                            backgroundColor: getTypeColor(location.type),
                            transform: [{ scale: pinScale }]
                          },
                          isSelected && styles.selectedPin
                        ]}
                        onPress={() => handleLocationPress(location)}
                      >
                        <Text style={styles.pinText}>{location.id}</Text>
                      </TouchableOpacity>
                    );
                  })}

                  {/* Custom Pin */}
                  {customPin && (
                    <TouchableOpacity
                      style={[
                        styles.locationPin,
                        styles.customPin,
                        {
                          left: customPin.displayX - 12,
                          top: customPin.displayY - 12,
                          backgroundColor: getTypeColor('custom'),
                          transform: [{ scale: Math.max(0.7, Math.min(1.2, 1.2 / currentScale)) }]
                        }
                      ]}
                      onPress={handleCustomPinPress}
                    >
                      <Text style={styles.pinText}>📍</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </Animated.View>
              </View>
            </View>
            
            {showControls && (
              <View style={styles.mapControls}>
                <TouchableOpacity style={styles.controlButton} onPress={handleZoomIn}>
                  <Text style={styles.controlText}>+</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.controlButton} onPress={handleZoomOut}>
                  <Text style={styles.controlText}>−</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.controlButton} onPress={resetMap}>
                  <Text style={styles.controlTextSmall}>⌂</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.controlButton, showCustomPinOption && styles.controlButtonActive]} 
                  onPress={() => setShowCustomPinOption(!showCustomPinOption)}
                >
                  <Text style={styles.controlTextSmall}>📍</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
          
          <View style={styles.instructions}>
            <Text style={styles.instructionText}>
              📍 Tap a pin to select pickup point
            </Text>
            <Text style={styles.instructionText}>
              🔍 Drag to pan • Use +/- to zoom • 📍 for custom location
            </Text>
            {showCustomPinOption && (
              <Text style={[styles.instructionText, styles.highlightText]}>
                🎯 Tap anywhere on map to place your custom pin
              </Text>
            )}
          </View>

          {/* Selected Location Info */}
          {selectedLocation && (
            <View style={styles.selectedLocationInfo}>
              <Text style={styles.selectedLocationTitle}>Selected Location</Text>
              <Text style={styles.selectedLocationName}>{selectedLocation.name}</Text>
              <Text style={styles.selectedLocationDetails}>
                Type: {selectedLocation.type.charAt(0).toUpperCase() + selectedLocation.type.slice(1)}
              </Text>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={() => onLocationSelect(selectedLocation)}
              >
                <Text style={styles.confirmButtonText}>Confirm This Location</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20, // Add horizontal padding to ensure centering
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '100%', // Use 100% of available width after padding
    maxHeight: screenHeight * 0.8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666',
  },
  mapContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  customPinOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: 'rgba(155, 89, 182, 0.9)',
    padding: 8,
    borderRadius: 8,
  },
  overlayText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 'bold',
  },
  mapViewport: {
    width: '100%', // Use full width of the container
    height: containerSize.height,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    alignSelf: 'center', // Ensure it's centered
  },
  panContainer: {
    width: '100%',
    height: '100%',
    flex: 1,
  },
  interactiveMap: {
    width: containerSize.width * 2, // Make it larger than viewport for panning
    height: containerSize.height * 2,
  },
  cityMap: {
    width: containerSize.width * 2, // Match the parent width
    height: containerSize.height * 2,
    position: 'relative',
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  locationPin: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  selectedPin: {
    borderColor: '#FFD700',
    borderWidth: 3,
    shadowColor: '#FFD700',
    shadowOpacity: 0.8,
  },
  pinText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  mapControls: {
    position: 'absolute',
    right: 10,
    top: 10,
    gap: 5,
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  controlButtonActive: {
    backgroundColor: 'rgba(155, 89, 182, 0.9)',
  },
  controlText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  controlTextSmall: {
    fontSize: 16,
    color: '#333',
  },
  instructions: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginVertical: 2,
  },
  highlightText: {
    fontWeight: 'bold',
    color: '#9B59B6',
  },
  customPin: {
    borderWidth: 3,
    borderColor: '#FFD700',
  },
  mapTouchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 2, // Lower zIndex so it doesn't block pan gestures
  },
  selectedLocationInfo: {
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    borderColor: '#3498db',
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    margin: 16,
    marginTop: 8,
  },
  selectedLocationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
    textAlign: 'center',
  },
  selectedLocationName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3498db',
    marginBottom: 4,
    textAlign: 'center',
  },
  selectedLocationDetails: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmButton: {
    backgroundColor: '#27ae60',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CustomMapComponent;