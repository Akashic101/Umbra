#pragma once

#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef void (*UmbraLocationCallback)(
	int32_t code,
	double lat,
	double lon,
	double alt
);

void umbra_request_location(UmbraLocationCallback callback);
void umbra_ensure_location_permission(void);

#ifdef __cplusplus
}
#endif
