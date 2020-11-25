const HUGE_VAL = Number.POSITIVE_INFINITY
const MAXORDER = 3

const ERRORS = ({
  MPARMERR: 'PARAMETER ERROR',
  MINTERR: 'INTERNAL ERROR',
  MUNSOLVABLE: 'NOT SOLVABLE',
  MNPTERR: 'NOT ENOUGH POINTS'
})

class GCP {
  constructor (dfGCPPixel, dfGCPLine, dfGCPX, dfGCPY) {
    this.dfGCPPixel = dfGCPPixel
    this.dfGCPLine = dfGCPLine
    this.dfGCPX = dfGCPX
    this.dfGCPY = dfGCPY
  }
}

class Control_Points {
  // int  count;
  // double *e1;
  // double *n1;
  // double *e2;
  // double *n2;
  // int *status;
}

class GCPTransformInfo {
  // double adfToGeoX[20];
  // double adfToGeoY[20];

  // double adfFromGeoX[20];
  // double adfFromGeoY[20];
  // double x1_mean;
  // double y1_mean;
  // double x2_mean;
  // double y2_mean;
  // int    nOrder;
  // int    bReversed;

  // int       nGCPCount;
  // GDAL_GCP *pasGCPList;
  // int    bRefine;
  // int    nMinimumGcps;
  // double dfTolerance;

  // volatile int nRefCount;

  constructor () {
    this.adfToGeoX = []
    this.adfToGeoY = []

    this.adfFromGeoX = []
    this.adfFromGeoY = []
  }
}

class MATRIX {
  // int     n;     /* SIZE OF THIS MATRIX (N x N) */
  // double *v;

  constructor (n = 0) {
    this.n = n
    this.v = []
  }

  getM (row, col) {
    return this.v[(((row) - 1) * (this.n)) + (col) - 1]
  }

  setM (row, col, value) {
    this.v[(((row) - 1) * (this.n)) + (col) - 1] = value
  }
}

function GDALCreateGCPTransformer (pasGCPList, nReqOrder, bReversed) {
  return GDALCreateGCPTransformerEx(pasGCPList, nReqOrder, bReversed, false, -1, -1)
}

function GDALCreateGCPTransformerEx (pasGCPList, nReqOrder, bReversed, bRefine, dfTolerance, nMinimumGcps) {
  // double *padfGeoX = nullptr;
  // double *padfGeoY = nullptr;
  // double *padfRasterX = nullptr;
  // double *padfRasterY = nullptr;
  // int *panStatus = nullptr;

  const nGCPCount = pasGCPList.length

  let nCRSresult = 0
  let sPoints = new Control_Points()

  let x1_sum = 0
  let y1_sum = 0
  let x2_sum = 0
  let y2_sum = 0

  //     memset( &sPoints, 0, sizeof(sPoints) );

  if (nReqOrder == 0) {
    if (nGCPCount >= 10) {
      // for now we avoid 3rd order since it is unstable
      nReqOrder = 2
    } else if (nGCPCount >= 6) {
      nReqOrder = 2
    } else {
      nReqOrder = 1
    }
  }

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

    let padfGeoX = []
    let padfGeoY = []
    let padfRasterX = []
    let padfRasterY = []
    let panStatus = []

    for (let iGCP = 0; iGCP < nGCPCount; iGCP++) {
      panStatus[iGCP] = 1
      padfGeoX[iGCP] = pasGCPList[iGCP].dfGCPX
      padfGeoY[iGCP] = pasGCPList[iGCP].dfGCPY
      padfRasterX[iGCP] = pasGCPList[iGCP].dfGCPPixel
      padfRasterY[iGCP] = pasGCPList[iGCP].dfGCPLine
      x1_sum += pasGCPList[iGCP].dfGCPPixel
      y1_sum += pasGCPList[iGCP].dfGCPLine
      x2_sum += pasGCPList[iGCP].dfGCPX
      y2_sum += pasGCPList[iGCP].dfGCPY
    }

    psInfo.x1_mean = x1_sum / nGCPCount
    psInfo.y1_mean = y1_sum / nGCPCount
    psInfo.x2_mean = x2_sum / nGCPCount
    psInfo.y2_mean = y2_sum / nGCPCount

    sPoints.count = nGCPCount
    sPoints.e1 = padfRasterX;
    sPoints.n1 = padfRasterY
    sPoints.e2 = padfGeoX
    sPoints.n2 = padfGeoY
    sPoints.status = panStatus

    nCRSresult = CRS_compute_georef_equations(psInfo, sPoints,
      psInfo.adfToGeoX, psInfo.adfToGeoY,
      psInfo.adfFromGeoX, psInfo.adfFromGeoY,
      nReqOrder)
  }

  return psInfo
}

function CRS_compute_georef_equations (psInfo, cp, E12, N12, E21, N21, order) {
  // C++ signature:
  // CRS_compute_georef_equations (GCPTransformInfo *psInfo, struct Control_Points *cp,
  //   double E12[], double N12[],
  //   double E21[], double N21[],
  //   int order)

  let tempptr

  if (order < 1 || order > MAXORDER) {
    throw new Error(ERRORS.MPARMERR)
  }

  /* CALCULATE THE FORWARD TRANSFORMATION COEFFICIENTS */
  calccoef(cp, psInfo.x1_mean, psInfo.y1_mean, E12, N12, order)

  /* SWITCH THE 1 AND 2 EASTING AND NORTHING ARRAYS */
  tempptr = cp.e1
  cp.e1 = cp.e2
  cp.e2 = tempptr
  tempptr = cp.n1
  cp.n1 = cp.n2
  cp.n2 = tempptr

  /* CALCULATE THE BACKWARD TRANSFORMATION COEFFICIENTS */
  calccoef(cp, psInfo.x2_mean, psInfo.y2_mean, E21, N21, order)

  /* SWITCH THE 1 AND 2 EASTING AND NORTHING ARRAYS BACK */
  tempptr = cp.e1
  cp.e1 = cp.e2
  cp.e2 = tempptr
  tempptr = cp.n1
  cp.n1 = cp.n2
  cp.n2 = tempptr
}

function calccoef (cp, x_mean, y_mean, E, N, order) {
  // C++ signature:
  // static int
  // calccoef (struct Control_Points *cp, double x_mean, double y_mean, double E[], double N[], int order)

  const m = new MATRIX()

  const a = []
  const b = []

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
  if (numactive == m.n) {
    exactdet(cp, m, x_mean, y_mean, a, b, E, N)
  } else {
    calcls(cp, m, x_mean, y_mean, a, b, E, N)
  }
}

function calcls (cp, m, x_mean, y_mean, a, b, E, N) {
  // C++ signature:
  // static int calcls (
  //   struct Control_Points *cp,
  //   struct MATRIX *m,
  //   double x_mean,
  //   double y_mean,
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

    a[i-1] = b[i-1] = 0
  }

  /* SUM THE UPPER HALF OF THE MATRIX AND THE COLUMN VECTORS ACCORDING TO
     THE LEAST SQUARES METHOD OF SOLVING OVER DETERMINED SYSTEMS */

  for (let n = 0; n < cp.count; n++) {
    if (cp.status[n] > 0) {
      numactive++

      for (let i = 1; i <= m.n; i++) {
        for (let j = i; j <= m.n; j++) {
          m.setM(i, j, m.getM(i, j) + term(i, cp.e1[n] - x_mean, cp.n1[n] - y_mean) * term(j, cp.e1[n] - x_mean, cp.n1[n] - y_mean))
        }

        a[i-1] += cp.e2[n] * term(i, cp.e1[n] - x_mean, cp.n1[n] - y_mean)
        b[i-1] += cp.n2[n] * term(i, cp.e1[n] - x_mean, cp.n1[n] - y_mean)
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

  return solvemat(m, a, b, E, N)
}

function exactdet (cp, m, x_mean, y_mean, a, b, E, N) {
  // C++ signature:
  // static int exactdet (
  //   struct Control_Points *cp,
  //   struct MATRIX *m,
  //   double x_mean,
  //   double y_mean,
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
        m.setM(currow, j, term(j, cp.e1[pntnow] - x_mean, cp.n1[pntnow] - y_mean))
      }

      /* POPULATE MATRIX A AND B */
      a[currow-1] = cp.e2[pntnow]
      b[currow-1] = cp.n2[pntnow]

      currow++
    }
  }

  if (currow - 1 !== m.n) {
    throw new Error(ERRORS.MINTERR)
  }

  return solvemat(m, a, b, E, N)
}

function solvemat (m, a, b, E, N) {
  // C++ signature:
  // static int solvemat (struct MATRIX *m,
  //   double a[], double b[], double E[], double N[])

  for (let i = 1; i <= m.n; i++) {
    let j = i

    /* find row with largest magnitude value for pivot value */
    let pivot = m.getM(i, j) /* ACTUAL VALUE OF THE LARGEST PIVOT CANDIDATE */
    let imark = i;

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
      const ta2 = a[i-1]
      a[i-1] = ta1
      a[imark - 1] = ta2

      const tb1 = b[imark-1]
      const tb2 = b[i-1]
      b[imark-1] = tb2
      b[i-1] = tb1
    }

    /* compute zeros above and below the pivot, and compute
       values for the rest of the row as well */
    for (let i2 = 1 ; i2 <= m.n ; i2++) {
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
  for (let i = 1; i <= m.n ; i++) {
    E[i - 1] = a[i - 1] / m.getM(i, i)
    N[i - 1] = b[i - 1] / m.getM(i, i)
  }
}

function term (nTerm, e, n) {
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

function GDALGCPTransform (pTransformArg, bDstToSrc, points) {
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
      transformedPoint = CRS_georef(
        points[i].x - psInfo.x2_mean, points[i].y - psInfo.y2_mean,
        psInfo.adfFromGeoX, psInfo.adfFromGeoY,
        psInfo.nOrder)
    } else {
      transformedPoint = CRS_georef(
        points[i].x - psInfo.x1_mean, points[i].y - psInfo.y1_mean,
        psInfo.adfToGeoX, psInfo.adfToGeoY,
        psInfo.nOrder)
    }

    transformedPoints[i] = {
      x: transformedPoint[0],
      y: transformedPoint[1]
    }
  }

  return transformedPoints
}

function CRS_georef (e1, n1, E, N, order) {
  // C++ signature:
  // static int CRS_georef (
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

    e = E[0]      + E[1] * e1 + E[2] * n1 +
        E[3] * e2 + E[4] * en + E[5] * n2

    n = N[0]      + N[1] * e1 + N[2] * n1 +
        N[3] * e2 + N[4] * en + N[5] * n2

    return [e, n]
  } else if (order === 3) {
    e2  = e1 * e1
    en  = e1 * n1
    n2  = n1 * n1
    e3  = e1 * e2
    e2n = e2 * n1
    en2 = e1 * n2
    n3  = n1 * n2

    e = E[0]      +
        E[1] * e1 + E[2] * n1  +
        E[3] * e2 + E[4] * en  + E[5] * n2  +
        E[6] * e3 + E[7] * e2n + E[8] * en2 + E[9] * n3
    n = N[0]      +
        N[1] * e1 + N[2] * n1  +
        N[3] * e2 + N[4] * en  + N[5] * n2  +
        N[6] * e3 + N[7] * e2n + N[8] * en2 + N[9] * n3

    return [e, n]
  } else {
    throw new Error(ERRORS.MPARMERR)
  }
}

module.exports = {
  GCP,
  GDALCreateGCPTransformer,
  GDALGCPTransform
}
