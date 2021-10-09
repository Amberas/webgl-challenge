const fragmentShader = `
    varying vec2 vertexUV;
    varying vec3 vertexNormal;
    uniform vec2 iResolution;
    uniform sampler2D iChannel0;
	uniform sampler2D iChannel1;
    uniform float iTime;
	uniform float iColor;

// based on https://www.shadertoy.com/view/lsf3RH by
// trisomie21 (THANKS!)
// My apologies for the ugly code.

float snoise(vec3 uv, float res)	// by trisomie21
{
	const vec3 s = vec3(1e0, 1e2, 1e4);

	uv *= res;

	vec3 uv0 = floor(mod(uv, res))*s;
	vec3 uv1 = floor(mod(uv+vec3(1.), res))*s;

	vec3 f = fract(uv); f = f*f*(7.0-2.0*f);

	vec4 v = vec4(uv0.x+uv0.y+uv0.z, uv1.x+uv0.y+uv0.z,
		      	  uv0.x+uv1.y+uv0.z, uv1.x+uv1.y+uv0.z);

	vec4 r = fract(sin(v*1e-3)*1e5);
	float r0 = mix(mix(r.x, r.y, f.x), mix(r.z, r.w, f.x), f.y);

	r = fract(sin((v + uv1.z - uv0.z)*1e-3)*1e5);
	float r1 = mix(mix(r.x, r.y, f.x), mix(r.z, r.w, f.x), f.y);

	return mix(r0, r1, f.z)*2.-1.;
}

float freqs[4];

void main()
{
	freqs[0] = texture2D( iChannel1, vertexUV ).x;
	freqs[1] = texture2D( iChannel1, vertexUV ).x;
	freqs[2] = texture2D( iChannel1, vertexUV ).x;
	freqs[3] = texture2D( iChannel1, vertexUV ).x;

	float brightness	= freqs[1] * 0.35 + freqs[2] * 0.50; //Effects overall size of the star. This also increases brightness.
	float radius		= 0.24 + brightness * 0.25; //Radius of star, where brightness gets tied to star size. should not be changed in respect of corona.
	float invRadius 	= 1.0/radius;

	//vec3 orange			= vec3( ((freqs[1]) * 0.9), 0.6, ((freqs[0]) * 0.9) ) * (1.0); //Corona color.
	//vec3 orangeRed		= vec3( ((freqs[2]) * 0.9), 0.2, ((freqs[3]) * 0.9) ) * (1.0); //Star color.
    //The following provided for use with quieter sources providing a much higher contrast. Suggested use with microphones or stereo mix.
    vec3 orange			= vec3( freqs[1], 0.3, freqs[0] ) * (1.5) + (0.2, 0.1, 0.1); //Corona color.
	vec3 orangeRed		= vec3( 0.7, 0.2, 0 ) * (1.25) + (iColor); //Star color.

	float time		= iTime * 0.1;
	float aspect	= iResolution.x/iResolution.y;
	vec2 uv			= vertexUV.xy / iResolution.xy;
	vec2 p 			= -0.5 + uv;
	p.x *= aspect;

	float fade		= pow( length( 2.0 * p ), 0.5 );
	float fVal1		= 1.0 - fade;
	float fVal2		= 1.0 - fade;

	float angle		= atan( p.x, p.y )/6.2832;
	float dist		= length(p);
	vec3 coord		= vec3( angle, dist, time * 0.1 );

	float newTime1	= abs( snoise( coord + vec3( 0.0, -time * ( 0.35 + brightness * 0.001 ), time * 0.015 ), 15.0 ) );
	float newTime2	= abs( snoise( coord + vec3( 0.0, -time * ( 0.15 + brightness * 0.001 ), time * 0.015 ), 45.0 ) );
	for( int i=1; i<=7; i++ ){
		float power = pow( 2.0, float(i + 1) );
		fVal1 += ( 0.5 / power ) * snoise( coord + vec3( 0.0, -time, time * 0.2 ), ( power * ( 10.0 ) * ( newTime1 + 1.0 ) ) );
		fVal2 += ( 0.5 / power ) * snoise( coord + vec3( 0.0, -time, time * 0.2 ), ( power * ( 25.0 ) * ( newTime2 + 1.0 ) ) );
	}

	float corona		= pow( fVal1 * max( 1.1 - fade, 0.0 ), 2.0 ) * 25.0;  //Effects 'bleed' of corona, or distance it travels outwards.
	corona				+= pow( fVal2 * max( 1.1 - fade, 0.0 ), 2.0 ) * 25.0;  //Effects intensity of corona.
	corona				*= 1.2 - newTime1; //Should be left alone, does the same as above two, but with less granularity.
	vec3 sphereNormal 	= vec3( 0.0, 0.0, 1.0 );
	vec3 dir 			= vec3( 0.0 );
	vec3 center			= vec3( 0.5, 0.5, 1.0 );
	vec3 starSphere		= vec3( 0.05 ); //Light bleed from star, should remain near 0

	vec2 sp = -1.0 + 2.0 * uv;
	sp.x *= aspect;
	sp *= ( 1.95 - brightness ); //Do not change, should remain extremely close to 2.0 - brightness. Extremely close.
  	float r = dot(sp,sp);
	float f = (1.0-sqrt(abs(1.0-r)))/(r) + brightness * 0.5; //Effects overall brightness of the sun.
	if( dist < radius ){  //Manages the surface animation.
		corona			*= pow( dist * invRadius, 24.0 );
  		vec2 newUv;
 		newUv.x = sp.x*f;
  		newUv.y = sp.y*f;
		newUv += vec2( time, 0.0 );

		vec3 texSample 	= texture2D( iChannel0, newUv ).rgb;
		float uOff		= ( texSample.g * brightness * 6.5 + time );
		vec2 starUV		= newUv + vec2( uOff, 0.0 );
		starSphere		= texture2D( iChannel0, starUV ).rgb;
	}

	float starGlow	= min( max( 1.0 - dist * ( 1.0 - brightness ), 0.0 ), 6.0 );
	gl_FragColor.rgb	= vec3( r );
	gl_FragColor.rgb	= vec3( f * ( 0.75 + brightness * 0.3 ) * orange ) + starSphere + corona * orange + starGlow * orangeRed;
	gl_FragColor.a		= 1.0;
}



`

export default fragmentShader;