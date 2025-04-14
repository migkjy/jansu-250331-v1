import { NextResponse } from "next/server"

/**
 * Creates a standardized error response
 * @param status HTTP status code for the error
 * @param message Error message to display
 * @returns NextResponse with error details
 */
export function getErrorResponse(status: number, message: string): NextResponse {
  return NextResponse.json(
    {
      error: message,
    },
    {
      status,
    }
  )
}
