type XYPoint = { x: number; y: number }

const HUGE_VAL = Number.POSITIVE_INFINITY
const MAXORDER = 3

const ERRORS = {
  MPARMERR: 'PARAMETER ERROR',
  MINTERR: 'INTERNAL ERROR',
  MUNSOLVABLE: 'NOT SOLVABLE',
  MNPTERR: 'NOT ENOUGH POINTS'
}

export class GCP {
  dfGCPPixel: number
  dfGCPLine: number
  dfGCPX: number
  dfGCPY: number

  constructor(
    dfGCPPixel: number,
    dfGCPLine: number,
    dfGCPX: number,
    dfGCPY: number
  ) {
    this.dfGCPPixel = dfGCPPixel
    this.dfGCPLine = dfGCPLine
    this.dfGCPX = dfGCPX
    this.dfGCPY = dfGCPY
  }
}

class ControlPoints {
  // int  count;
  // double *e1;
  // double *n1;
  // double *e2;
  // double *n2;
  // int *status;

  count = 0
  e1: number[] = []
  n1: number[] = []
  e2: number[] = []
  n2: number[] = []
  status: number[] = []
}

export class GCPTransformInfo {
  // double adfToGeoX[20];
  // double adfToGeoY[20];

  // double adfFromGeoX[20];
  // double adfFromGeoY[20];
  // double x1Mean;
  // double y1Mean;
  // double x2Mean;
  // double y2Mean;
  // int    nOrder;
  // int    bReversed;

  // int       nGCPCount;
  // GDAL_GCP *pasGCPList;
  // int    bRefine;
  // int    nMinimumGcps;
  // double dfTolerance;

  // volatile int nRefCount;

  x1Mean = 0
  y1Mean = 0
  x2Mean = 0
  y2Mean = 0

  bReversed = false
  nOrder = 1
  bRefine = false
  dfTolerance = -1
  nMinimumGcps = -1

  nRefCount = 1

  pasGCPList: GCP[] = []
  nGCPCount = 0

  adfToGeoX: number[] = []
  adfToGeoY: number[] = []

  adfFromGeoX: number[] = []
  adfFromGeoY: number[] = []

  constructor() {
    this.adfToGeoX = []
    this.adfToGeoY = []

    this.adfFromGeoX = []
    this.adfFromGeoY = []
  }
}

class MATRIX {
  // int     n;     /* SIZE OF THIS MATRIX (N x N) */
  // double *v;

  n: number
  v: number[]

  constructor(n = 0) {
    this.n = n
    this.v = []
  }

  getM(row: number, col: number) {
    return this.v[(row - 1) * this.n + col - 1]
  }

  setM(row: number, col: number, value: number) {
    this.v[(row - 1) * this.n + col - 1] = value
  }
}

export function GDALCreateGCPTransformer(
  pasGCPList: GCP[],
  nReqOrder: number,
  bReversed: boolean
) {
  return GDALCreateGCPTransformerEx(
    pasGCPList,
    nReqOrder,
    bReversed,
    false,
    -1,
    -1
  )
}

function GDALCreateGCPTransformerEx(
  pasGCPList: GCP[],
  nReqOrder: number,
  bReversed: boolean,
  bRefine: boolean,
  dfTolerance: number,
  nMinimumGcps: number
) {
  // double *padfGeoX = nullptr;
  // double *padfGeoY = nullptr;
  // double *padfRasterX = nullptr;
  // double *padfRasterY = nullptr;
  // int *panStatus = nullptr;

  const nGCPCount = pasGCPList.length

  // let nCRSresult
  const sPoints = new ControlPoints()

  let x1Sum = 0
  let y1Sum = 0
  let x2Sum = 0
  let y2Sum = 0

  //     memset( &sPoints, 0, sizeof(sPoints) );

  // if (nReqOrder === 0) {
  //   if (nGCPCount >= 10) {
  //     // for now we avoid 3rd order since it is unstable
  //     nReqOrder = 2
  //   } else if (nGCPCount >= 6) {
  //     nReqOrder = 2
  //   } else {
  //     nReqOrder = 1
  //   }
  // }

  // TODO: the code above that sets nReqOrder comes from GDAL
  // this can lead to unwanted and unpredictable results
  // in the future, nReqOrder can maybe be selected by the user
  // for now, always set nReqOrder to 1
  nReqOrder = 1

  const psInfo = new GCPTransformInfo()
  psInfo.bReversed = bReversed
  psInfo.nOrder = nReqOrder
  psInfo.bRefine = bRefine
  psInfo.dfTolerance = dfTolerance
  psInfo.nMinimumGcps = nMinimumGcps

  psInfo.nRefCount = 1

  psInfo.pasGCPList = pasGCPList
  psInfo.nGCPCount = nGCPCount

  // memcpy( psInfo->sTI.abySignature, GDAL_GTI2_SIGNATURE, strlen(GDAL_GTI2_SIGNATURE) );
  // psInfo->sTI.pszClassName = "GDALGCPTransformer";
  // psInfo->sTI.pfnTransform = GDALGCPTransform;
  // psInfo->sTI.pfnCleanup = GDALDestroyGCPTransformer;
  // psInfo->sTI.pfnSerialize = GDALSerializeGCPTransformer;
  // psInfo->sTI.pfnCreateSimilar = GDALCreateSimilarGCPTransformer;

  /* -------------------------------------------------------------------- */
  /*      Compute the forward and reverse polynomials.                    */
  /* -------------------------------------------------------------------- */

  if (nGCPCount === 0) {
    throw new Error('NOT ENOUGH POINTS')
  } else if (bRefine) {
    throw new Error('remove_outliers not implemented')
    // nCRSresult = remove_outliers(psInfo);
  } else {
    /* -------------------------------------------------------------------- */
    /*      Allocate and initialize the working points list.                */
    /* -------------------------------------------------------------------- */

    const padfGeoX = []
    const padfGeoY = []
    const padfRasterX = []
    const padfRasterY = []
    const panStatus = []

    for (let iGCP = 0; iGCP < nGCPCount; iGCP++) {
      panStatus[iGCP] = 1
      padfGeoX[iGCP] = pasGCPList[iGCP].dfGCPX
      padfGeoY[iGCP] = pasGCPList[iGCP].dfGCPY
      padfRasterX[iGCP] = pasGCPList[iGCP].dfGCPPixel
      padfRasterY[iGCP] = pasGCPList[iGCP].dfGCPLine
      x1Sum += pasGCPList[iGCP].dfGCPPixel
      y1Sum += pasGCPList[iGCP].dfGCPLine
      x2Sum += pasGCPList[iGCP].dfGCPX
      y2Sum += pasGCPList[iGCP].dfGCPY
    }

    psInfo.x1Mean = x1Sum / nGCPCount
    psInfo.y1Mean = y1Sum / nGCPCount
    psInfo.x2Mean = x2Sum / nGCPCount
    psInfo.y2Mean = y2Sum / nGCPCount

    sPoints.count = nGCPCount
    sPoints.e1 = padfRasterX
    sPoints.n1 = padfRasterY
    sPoints.e2 = padfGeoX
    sPoints.n2 = padfGeoY
    sPoints.status = panStatus

    crsComputeGeorefEquations(
      psInfo,
      sPoints,
      psInfo.adfToGeoX,
      psInfo.adfToGeoY,
      psInfo.adfFromGeoX,
      psInfo.adfFromGeoY,
      nReqOrder
    )
  }

  return psInfo
}

function crsComputeGeorefEquations(
  psInfo: GCPTransformInfo,
  cp: ControlPoints,
  E12: number[],
  N12: number[],
  E21: number[],
  N21: number[],
  order: number
) {
  // C++ signature:
  // crsComputeGeorefEquations (GCPTransformInfo *psInfo, struct ControlPoints *cp,
  //   double E12[], double N12[],
  //   double E21[], double N21[],
  //   int order)

  let tempptr

  if (order < 1 || order > MAXORDER) {
    throw new Error(ERRORS.MPARMERR)
  }

  /* CALCULATE THE FORWARD TRANSFORMATION COEFFICIENTS */
  calcCoef(cp, psInfo.x1Mean, psInfo.y1Mean, E12, N12, order)

  /* SWITCH THE 1 AND 2 EASTING AND NORTHING ARRAYS */
  tempptr = cp.e1
  cp.e1 = cp.e2
  cp.e2 = tempptr
  tempptr = cp.n1
  cp.n1 = cp.n2
  cp.n2 = tempptr

  /* CALCULATE THE BACKWARD TRANSFORMATION COEFFICIENTS */
  calcCoef(cp, psInfo.x2Mean, psInfo.y2Mean, E21, N21, order)

  /* SWITCH THE 1 AND 2 EASTING AND NORTHING ARRAYS BACK */
  tempptr = cp.e1
  cp.e1 = cp.e2
  cp.e2 = tempptr
  tempptr = cp.n1
  cp.n1 = cp.n2
  cp.n2 = tempptr
}

function calcCoef(
  cp: ControlPoints,
  xMean: number,
  yMean: number,
  E: number[],
  N: number[],
  order: number
) {
  // C++ signature:
  // static int
  // calcCoef (struct ControlPoints *cp, double xMean, double yMean, double E[], double N[], int order)

  const m = new MATRIX()

  const a: number[] = []
  const b: number[] = []

  let numactive = 0 /* NUMBER OF ACTIVE CONTROL POINTS */
  let i = 0

  /* CALCULATE THE NUMBER OF VALID CONTROL POINTS */
  for (i = numactive = 0; i < cp.count; i++) {
    if (cp.status[i] > 0) {
      numactive++
    }
  }

  /* CALCULATE THE MINIMUM NUMBER OF CONTROL POINTS NEEDED TO DETERMINE
    A TRANSFORMATION OF THIS ORDER */
  m.n = ((order + 1) * (order + 2)) / 2

  if (numactive < m.n) {
    throw new Error(ERRORS.MNPTERR)
  }

  m.v = []

  /* INITIALIZE MATRIX */
  if (numactive === m.n) {
    exactDet(cp, m, xMean, yMean, a, b, E, N)
  } else {
    calcls(cp, m, xMean, yMean, a, b, E, N)
  }
}

function calcls(
  cp: ControlPoints,
  m: MATRIX,
  xMean: number,
  yMean: number,
  a: number[],
  b: number[],
  E: number[],
  N: number[]
) {
  // C++ signature:
  // static int calcls (
  //   struct ControlPoints *cp,
  //   struct MATRIX *m,
  //   double xMean,
  //   double yMean,
  //   double a[],
  //   double b[],
  //   double E[],     /* EASTING COEFFICIENTS */
  //   double N[]     /* NORTHING COEFFICIENTS */
  // )

  let numactive = 0

  /* INITIALIZE THE UPPER HALF OF THE MATRIX AND THE TWO COLUMN VECTORS */

  for (let i = 1; i <= m.n; i++) {
    for (let j = i; j <= m.n; j++) {
      m.setM(i, j, 0)
    }

    a[i - 1] = b[i - 1] = 0
  }

  /* SUM THE UPPER HALF OF THE MATRIX AND THE COLUMN VECTORS ACCORDING TO
     THE LEAST SQUARES METHOD OF SOLVING OVER DETERMINED SYSTEMS */

  for (let n = 0; n < cp.count; n++) {
    if (cp.status[n] > 0) {
      numactive++

      for (let i = 1; i <= m.n; i++) {
        for (let j = i; j <= m.n; j++) {
          m.setM(
            i,
            j,
            m.getM(i, j) +
              term(i, cp.e1[n] - xMean, cp.n1[n] - yMean) *
                term(j, cp.e1[n] - xMean, cp.n1[n] - yMean)
          )
        }

        a[i - 1] += cp.e2[n] * term(i, cp.e1[n] - xMean, cp.n1[n] - yMean)
        b[i - 1] += cp.n2[n] * term(i, cp.e1[n] - xMean, cp.n1[n] - yMean)
      }
    }
  }

  if (numactive <= m.n) {
    throw new Error(ERRORS.MINTERR)
  }

  /* TRANSPOSE VALUES IN UPPER HALF OF M TO OTHER HALF */
  for (let i = 2; i <= m.n; i++) {
    for (let j = 1; j < i; j++) {
      m.setM(i, j, m.getM(j, i))
    }
  }

  return solveMat(m, a, b, E, N)
}

function exactDet(
  cp: ControlPoints,
  m: MATRIX,
  xMean: number,
  yMean: number,
  a: number[],
  b: number[],
  E: number[],
  N: number[]
) {
  // C++ signature:
  // static int exactDet (
  //   struct ControlPoints *cp,
  //   struct MATRIX *m,
  //   double xMean,
  //   double yMean,
  //   double a[],
  //   double b[],
  //   double E[],     /* EASTING COEFFICIENTS */
  //   double N[]     /* NORTHING COEFFICIENTS */
  // )
  let currow = 1

  for (let pntnow = 0; pntnow < cp.count; pntnow++) {
    if (cp.status[pntnow] > 0) {
      /* POPULATE MATRIX M */
      for (let j = 1; j <= m.n; j++) {
        m.setM(currow, j, term(j, cp.e1[pntnow] - xMean, cp.n1[pntnow] - yMean))
      }

      /* POPULATE MATRIX A AND B */
      a[currow - 1] = cp.e2[pntnow]
      b[currow - 1] = cp.n2[pntnow]

      currow++
    }
  }

  if (currow - 1 !== m.n) {
    throw new Error(ERRORS.MINTERR)
  }

  return solveMat(m, a, b, E, N)
}

function solveMat(
  m: MATRIX,
  a: number[],
  b: number[],
  E: number[],
  N: number[]
) {
  // C++ signature:
  // static int solveMat (struct MATRIX *m,
  //   double a[], double b[], double E[], double N[])

  for (let i = 1; i <= m.n; i++) {
    const j = i

    /* find row with largest magnitude value for pivot value */
    let pivot = m.getM(i, j) /* ACTUAL VALUE OF THE LARGEST PIVOT CANDIDATE */
    let imark = i

    for (let i2 = i + 1; i2 <= m.n; i2++) {
      if (Math.abs(m.getM(i2, j)) > Math.abs(pivot)) {
        pivot = m.getM(i2, j)
        imark = i2
      }
    }

    /* if the pivot is very small then the points are nearly co-linear */
    /* co-linear points result in an undefined matrix, and nearly */
    /* co-linear points results in a solution with rounding error */

    if (pivot === 0.0) {
      throw new Error(ERRORS.MUNSOLVABLE)
    }

    /* if row with highest pivot is not the current row, switch them */
    if (imark !== i) {
      for (let j2 = 1; j2 <= m.n; j2++) {
        // std::swap(M(imark,j2), M(i,j2));
        const M1 = m.getM(imark, j2)
        const M2 = m.getM(i, j2)

        m.setM(imark, j2, M2)
        m.setM(i, j2, M1)
      }

      // std::swap(a[imark-1], a[i-1]);
      // std::swap(b[imark-1], b[i-1]);
      const ta1 = a[imark - 1]
      const ta2 = a[i - 1]
      a[i - 1] = ta1
      a[imark - 1] = ta2

      const tb1 = b[imark - 1]
      const tb2 = b[i - 1]
      b[imark - 1] = tb2
      b[i - 1] = tb1
    }

    /* compute zeros above and below the pivot, and compute
       values for the rest of the row as well */
    for (let i2 = 1; i2 <= m.n; i2++) {
      if (i2 !== i) {
        const factor = m.getM(i2, j) / pivot

        for (let j2 = j; j2 <= m.n; j2++) {
          const d = factor * m.getM(i, j2)
          m.setM(i2, j2, m.getM(i2, j2) - d)
        }

        a[i2 - 1] -= factor * a[i - 1]
        b[i2 - 1] -= factor * b[i - 1]
      }
    }
  }

  /* SINCE ALL OTHER VALUES IN THE MATRIX ARE ZERO NOW, CALCULATE THE
    COEFFICIENTS BY DIVIDING THE COLUMN VECTORS BY THE DIAGONAL VALUES. */
  for (let i = 1; i <= m.n; i++) {
    E[i - 1] = a[i - 1] / m.getM(i, i)
    N[i - 1] = b[i - 1] / m.getM(i, i)
  }
}

function term(nTerm: number, e: number, n: number) {
  switch (nTerm) {
    case 1:
      return 1
    case 2:
      return e
    case 3:
      return n
    case 4:
      return e * e
    case 5:
      return e * n
    case 6:
      return n * n
    case 7:
      return e * e * e
    case 8:
      return e * e * n
    case 9:
      return e * n * n
    case 10:
      return n * n * n
  }

  return 0
}

export function GDALGCPTransform(
  pTransformArg: GCPTransformInfo,
  bDstToSrc: boolean,
  points: XYPoint[]
) {
  const nPointCount = points.length

  // GCPTransformInfo *psInfo = static_cast<GCPTransformInfo *>(pTransformArg);
  const psInfo = pTransformArg

  const transformedPoints = []

  if (psInfo.bReversed) {
    bDstToSrc = !bDstToSrc
  }

  for (let i = 0; i < nPointCount; i++) {
    if (points[i].x === HUGE_VAL || points[i].y === HUGE_VAL) {
      throw new Error('HUGE_VAL')
    }

    let transformedPoint

    if (bDstToSrc) {
      transformedPoint = crsGeoref(
        points[i].x - psInfo.x2Mean,
        points[i].y - psInfo.y2Mean,
        psInfo.adfFromGeoX,
        psInfo.adfFromGeoY,
        psInfo.nOrder
      )
    } else {
      transformedPoint = crsGeoref(
        points[i].x - psInfo.x1Mean,
        points[i].y - psInfo.y1Mean,
        psInfo.adfToGeoX,
        psInfo.adfToGeoY,
        psInfo.nOrder
      )
    }

    transformedPoints[i] = {
      x: transformedPoint[0],
      y: transformedPoint[1]
    }
  }

  return transformedPoints
}

function crsGeoref(
  e1: number,
  n1: number,
  E: number[],
  N: number[],
  order: number
) {
  // C++ signature:
  // static int crsGeoref (
  //   double e1,  /* EASTINGS TO BE TRANSFORMED */
  //   double n1,  /* NORTHINGS TO BE TRANSFORMED */
  //   double *e,  /* EASTINGS TO BE TRANSFORMED */
  //   double *n,  /* NORTHINGS TO BE TRANSFORMED */
  //   double E[], /* EASTING COEFFICIENTS */
  //   double N[], /* NORTHING COEFFICIENTS */
  //   int order  /* ORDER OF TRANSFORMATION TO BE PERFORMED, MUST MATCH THE
  //                ORDER USED TO CALCULATE THE COEFFICIENTS */
  // )

  let e3 = 0
  let e2n = 0
  let en2 = 0
  let n3 = 0
  let e2 = 0
  let en = 0
  let n2 = 0

  let e
  let n

  if (order === 1) {
    e = E[0] + E[1] * e1 + E[2] * n1
    n = N[0] + N[1] * e1 + N[2] * n1

    return [e, n]
  } else if (order === 2) {
    e2 = e1 * e1
    n2 = n1 * n1
    en = e1 * n1

    e = E[0] + E[1] * e1 + E[2] * n1 + E[3] * e2 + E[4] * en + E[5] * n2

    n = N[0] + N[1] * e1 + N[2] * n1 + N[3] * e2 + N[4] * en + N[5] * n2

    return [e, n]
  } else if (order === 3) {
    e2 = e1 * e1
    en = e1 * n1
    n2 = n1 * n1
    e3 = e1 * e2
    e2n = e2 * n1
    en2 = e1 * n2
    n3 = n1 * n2

    e =
      E[0] +
      E[1] * e1 +
      E[2] * n1 +
      E[3] * e2 +
      E[4] * en +
      E[5] * n2 +
      E[6] * e3 +
      E[7] * e2n +
      E[8] * en2 +
      E[9] * n3
    n =
      N[0] +
      N[1] * e1 +
      N[2] * n1 +
      N[3] * e2 +
      N[4] * en +
      N[5] * n2 +
      N[6] * e3 +
      N[7] * e2n +
      N[8] * en2 +
      N[9] * n3

    return [e, n]
  } else {
    throw new Error(ERRORS.MPARMERR)
  }
}
