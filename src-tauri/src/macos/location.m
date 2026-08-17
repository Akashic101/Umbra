#import "location.h"
#import <CoreLocation/CoreLocation.h>
#import <Foundation/Foundation.h>

@interface UmbraLocator : NSObject <CLLocationManagerDelegate>
@property (nonatomic, strong) CLLocationManager *manager;
@property (nonatomic, assign) UmbraLocationCallback callback;
@end

@implementation UmbraLocator

- (instancetype)init {
	self = [super init];
	if (self) {
		_manager = [[CLLocationManager alloc] init];
		_manager.delegate = self;
		_manager.desiredAccuracy = kCLLocationAccuracyHundredMeters;
	}
	return self;
}

- (BOOL)isAuthorized {
	CLAuthorizationStatus status = self.manager.authorizationStatus;
	return status == kCLAuthorizationStatusAuthorizedAlways;
}

- (void)finishWithCode:(int32_t)code
		lat:(double)lat
		lon:(double)lon
		alt:(double)alt {
	UmbraLocationCallback callback = self.callback;
	self.callback = NULL;
	[self.manager stopUpdatingLocation];
	if (callback) {
		callback(code, lat, lon, alt);
	}
}

- (void)start {
	if (![CLLocationManager locationServicesEnabled]) {
		[self finishWithCode:1 lat:0 lon:0 alt:0];
		return;
	}

	CLAuthorizationStatus status = self.manager.authorizationStatus;
	if (status == kCLAuthorizationStatusDenied ||
		status == kCLAuthorizationStatusRestricted) {
		[self finishWithCode:1 lat:0 lon:0 alt:0];
		return;
	}

	if (status == kCLAuthorizationStatusNotDetermined) {
		[self.manager requestWhenInUseAuthorization];
	}
	[self.manager startUpdatingLocation];
}

- (void)ensurePermission {
	if (![CLLocationManager locationServicesEnabled]) {
		return;
	}
	if (self.manager.authorizationStatus == kCLAuthorizationStatusNotDetermined) {
		[self.manager requestWhenInUseAuthorization];
	}
	[self.manager startUpdatingLocation];
}

- (void)locationManagerDidChangeAuthorization:(CLLocationManager *)manager {
	if ([self isAuthorized]) {
		[manager startUpdatingLocation];
		return;
	}
	CLAuthorizationStatus status = manager.authorizationStatus;
	if (status == kCLAuthorizationStatusDenied ||
		status == kCLAuthorizationStatusRestricted) {
		[self finishWithCode:1 lat:0 lon:0 alt:0];
	}
}

- (void)locationManager:(CLLocationManager *)manager
	didChangeAuthorizationStatus:(CLAuthorizationStatus)status {
	[self locationManagerDidChangeAuthorization:manager];
}

- (void)locationManager:(CLLocationManager *)manager
	didUpdateLocations:(NSArray<CLLocation *> *)locations {
	CLLocation *location = locations.lastObject;
	if (!location) {
		return;
	}
	[self finishWithCode:0
		lat:location.coordinate.latitude
		lon:location.coordinate.longitude
		alt:location.altitude];
}

- (void)locationManager:(CLLocationManager *)manager
	didFailWithError:(NSError *)error {
	int32_t code = error.code == kCLErrorDenied ? 1 : 2;
	[self finishWithCode:code lat:0 lon:0 alt:0];
}

@end

static UmbraLocator *gLocator;

static UmbraLocator *umbraLocator(void) {
	static dispatch_once_t once;
	dispatch_once(&once, ^{
		gLocator = [UmbraLocator new];
	});
	return gLocator;
}

void umbra_request_location(UmbraLocationCallback callback) {
	dispatch_async(dispatch_get_main_queue(), ^{
		UmbraLocator *locator = umbraLocator();
		locator.callback = callback;
		[locator start];
	});
}

void umbra_ensure_location_permission(void) {
	dispatch_async(dispatch_get_main_queue(), ^{
		[umbraLocator() ensurePermission];
	});
}
